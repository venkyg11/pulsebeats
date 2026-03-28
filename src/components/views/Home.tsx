import React, { useMemo } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Music, Sparkles } from 'lucide-react';
import type { SongMetadata } from '../../utils/db';
import { formatDuration } from '../../utils/format';

export const Home: React.FC = () => {
  const { library, permissionStatus, verifyLibrary } = useFiles();
  const { playSong, currentSong } = usePlayer();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isRecent = (timestamp: number) => {
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return Date.now() - timestamp < fortyEightHours;
  };

  // Sections Sorting Logic
  const sections = useMemo(() => {
    const base = [...library];
    return {
      mostPlayed: base.sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 6),
      recentListened: base.filter(s => s.lastPlayedAt).sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)).slice(0, 6),
      highestCount: base.sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 6),
      latestAdded: base.sort((a, b) => b.addedAt - a.addedAt).slice(0, 6),
      favorites: base.filter(s => s.isFavorite).slice(0, 6),
    };
  }, [library]);

  const renderSection = (title: string, songs: SongMetadata[]) => {
    if (songs.length === 0) return null;
    return (
      <section className="dash-section" style={{ marginBottom: '40px' }}>
        <h2 className="section-title">{title}</h2>
        <div className="home-card-grid">
          {songs.map((song) => {
            const isPlaying = currentSong?.id === song.id;
            return (
              <div 
                key={song.id} 
                className={`music-card glass-panel song-card-glow ${isPlaying ? 'playing' : ''}`} 
                onClick={() => {
                  const globalIdx = library.findIndex(s => s.id === song.id);
                  playSong(globalIdx, library);
                }}
              >
                {/* Top Row: New Badge & Duration */}
                {isRecent(song.addedAt) && <div className="badge-new">NEW</div>}
                <div className="card-duration">{formatDuration(song.duration)}</div>

                {/* Center Content: Music Icon / Cover Art */}
                <div className="card-art">
                  {song.coverArt ? (
                    <img src={song.coverArt} alt={song.title} />
                  ) : (
                    <div className="card-fallback-icon">
                      <Music size={40} />
                    </div>
                  )}
                </div>

                {/* Bottom Content: Info */}
                <div className="card-info">
                   <h3 title={song.title}>{song.title}</h3>
                   <p title={song.artist}>{song.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // Static Mood Mixes Section
  const MoodMixes = () => (
    <section className="dash-section" style={{ marginBottom: '40px' }}>
      <h2 className="section-title">Pulse Mood Mixes</h2>
      <div className="home-card-grid">
        {[
          { name: 'Neon Nights', color: '#ff003c' },
          { name: 'Cyber Focus', color: '#00e5ff' },
          { name: 'Deep Space', color: '#b026ff' },
          { name: 'Liquid Chill', color: '#00ff66' },
          { name: 'Sunset Vibe', color: '#ff5e00' },
          { name: 'Data Stream', color: '#e0e0e0' }
        ].map(mix => (
          <div key={mix.name} className="music-card glass-panel mix-card">
            <div className="card-art" style={{ background: `linear-gradient(45deg, #121212, ${mix.color}11)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: mix.color, opacity: 0.6 }}><Sparkles size={32} /></div>
              <div className="mix-overlay">
                 <h3 style={{ fontSize: '12px', fontWeight: '800', textAlign: 'center', textTransform: 'uppercase' }}>{mix.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>{getTimeGreeting()}</h1>
        <p className="text-muted">Your futuristic music hub</p>
      </header>

      <div className="dashboard-grid">
        {library.length === 0 && permissionStatus === 'prompt' && (
          <div className="glass-panel permission-banner" style={{ border: '1px solid var(--primary)', background: 'rgba(0, 229, 255, 0.05)', marginBottom: '24px', padding: '16px' }}>
            <div className="flex-between">
              <div>
                <h3 className="text-primary" style={{ marginBottom: '4px' }}>Library Activation Required</h3>
                <p className="text-muted" style={{ fontSize: '14px' }}>Verify your music folder once to enable instant playback for this session.</p>
              </div>
              <button 
                className="btn-primary" 
                onClick={verifyLibrary}
                style={{ width: 'auto', padding: '10px 24px', fontSize: '14px' }}
              >
                Activate Library
              </button>
            </div>
          </div>
        )}

        {library.length === 0 ? (
          <div className="empty-state glass-panel">
            <p>No songs found. Use the floating (+) button to import your local music library.</p>
          </div>
        ) : (
          <>
            {renderSection("Most Played Songs", sections.mostPlayed)}
            {renderSection("Recent Listening", sections.recentListened)}
            {renderSection("Highest Play Count", sections.highestCount)}
            {renderSection("Latest Added Files", sections.latestAdded)}
            {renderSection("Your Favorites", sections.favorites)}
            <MoodMixes />
          </>
        )}
      </div>
    </div>
  );
};
