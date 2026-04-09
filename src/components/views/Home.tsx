import React, { useMemo, useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Music, Sparkles, Search, LayoutGrid, List, Columns, Play, Heart } from 'lucide-react';
import type { SongMetadata } from '../../utils/db';
import { formatDuration } from '../../utils/format';

export const Home: React.FC = () => {
  const { library, permissionStatus, verifyLibrary, toggleFavorite } = useFiles();
  const { playSong, currentSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'scroll' | 'grid' | 'list'>('scroll');
  const [animatingId, setAnimatingId] = useState<string | null>(null);

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

  const renderSection = (title: string, rawSongs: SongMetadata[]) => {
    let songs = rawSongs;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      songs = songs.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q) || 
        s.album.toLowerCase().includes(q)
      );
    }

    if (songs.length === 0) return null;

    const renderCard = (song: SongMetadata, idx: number) => {
      const isPlaying = currentSong?.id === song.id;
      return (
        <div 
          key={song.id} 
          className={`music-card glass-panel ${isPlaying ? 'playing active-glow' : ''}`} 
          style={{ animationDelay: `${idx * 0.05}s` }}
          onClick={() => {
            const globalIdx = library.findIndex(s => s.id === song.id);
            playSong(globalIdx, library);
          }}
        >
          <div className="card-art-container">
            {song.coverArt ? (
              <img src={song.coverArt} alt={song.title} className="card-art-img" loading="lazy" />
            ) : (
              <div className="card-art-placeholder">
                <Music size={32} />
              </div>
            )}
            
            <div className="card-overlays">
              {isRecent(song.addedAt) && <span className="badge-new">NEW</span>}
              <span className="card-duration-tag">{formatDuration(song.duration)}</span>
            </div>

            <div className={`card-play-overlay ${isPlaying ? 'visible' : ''}`}>
              <div className="play-pulse-icon" />
            </div>
          </div>

          <div className="card-details">
             <h3 className="card-title" title={song.title}>{song.title}</h3>
             <p className="card-subtitle" title={song.artist}>{song.artist}</p>
          </div>
        </div>
      );
    };

    const renderListItem = (song: SongMetadata, idx: number) => {
      const isActive = currentSong?.id === song.id;
      return (
        <div 
          key={song.id} 
          className={`list-item glass-panel ${isActive ? 'active' : ''}`} 
          onDoubleClick={() => {
            const globalIdx = library.findIndex(s => s.id === song.id);
            playSong(globalIdx, library);
          }}
        >
          <div className="list-art">
              {song.coverArt ? <img src={song.coverArt} alt="art" loading="lazy" /> : <div className="card-fallback-icon"><Music size={24} /></div>}
          </div>
          <div className="list-meta">
              <h4>{song.title}</h4>
              <p className="list-album" style={{margin:0, opacity:0.8}}>{song.artist}</p>
          </div>
          
          <button 
            className="list-action-btn heart-btn" 
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(song.id);
              setAnimatingId(song.id);
              setTimeout(() => setAnimatingId(null), 600);
            }}
            title={song.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <div className={`heart-pop-wrapper ${animatingId === song.id ? 'heart-pop' : ''}`}>
              <Heart 
                size={20} 
                className={`heart-icon ${song.isFavorite ? 'active' : ''}`} 
              />
            </div>
          </button>
          
          <button 
            className="list-action-btn play-btn" 
            onClick={() => {
               const globalIdx = library.findIndex(s => s.id === song.id);
               playSong(globalIdx, library);
            }}
          >
            <Play size={20} fill={isActive ? "var(--bg-base)" : "none"} />
          </button>
        </div>
      );
    };

    return (
      <section className="dash-section" style={{ marginBottom: '40px' }}>
        <h2 className="section-title">{title}</h2>
        
        {viewMode === 'scroll' && (
          <div className="horizontal-scroll-row">
            {songs.map((song, i) => renderCard(song, i))}
          </div>
        )}
        
        {viewMode === 'grid' && (
          <div className="home-card-grid">
            {songs.map((song, i) => renderCard(song, i))}
          </div>
        )}
        
        {viewMode === 'list' && (
          <div className="list-view">
            {songs.map((song, i) => renderListItem(song, i))}
          </div>
        )}
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
        <div className="view-header-top">
          <h1>{getTimeGreeting()}</h1>
          <p className="text-muted">Welcome back to PulseBeat</p>
          <p className="venky-tagline">created by venky</p>
        </div>
        
        {library.length > 0 && (
          <div className="action-buttons-row">
            <button 
              className="glass-action-btn primary"
              onClick={() => {
                if (library.length > 0) {
                  const randomIdx = Math.floor(Math.random() * library.length);
                  playSong(randomIdx, library);
                }
              }}
            >
              Shuffle All
            </button>
            <button 
              className="glass-action-btn secondary"
              onClick={() => {
                const recent = [...library].filter(s => s.lastPlayedAt).sort((a,b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
                if (recent.length > 0) {
                  const idx = library.findIndex(s => s.id === recent[0].id);
                  playSong(idx, library);
                }
              }}
            >
              Resume Last Session
            </button>
          </div>
        )}

        {library.length > 0 && (
          <div className="home-controls-row flex-between" style={{ marginTop: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="search-box glass-panel" style={{ flex: '1', minWidth: '280px' }}>
              <Search size={20} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search your library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="view-toggles glass-panel flex-between" style={{ padding: '4px', borderRadius: '24px' }}>
              <button 
                className={`sop-icon-btn ${viewMode === 'scroll' ? 'active' : ''}`}
                onClick={() => setViewMode('scroll')}
                style={{ width: '40px', border: 'none', background: viewMode === 'scroll' ? 'rgba(0,0,0,0.2)' : 'none' }}
                title="Scroll View"
              >
                <Columns size={18} />
              </button>
              <button 
                className={`sop-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                style={{ width: '40px', border: 'none', background: viewMode === 'grid' ? 'rgba(0,0,0,0.2)' : 'none' }}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                className={`sop-icon-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                style={{ width: '40px', border: 'none', background: viewMode === 'list' ? 'rgba(0,0,0,0.2)' : 'none' }}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        )}
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
            {renderSection("Recently Played", sections.recentListened)}
            {renderSection("Continue Listening", sections.mostPlayed)}
            {renderSection("Most Played", sections.highestCount)}
            {renderSection("Latest Added", sections.latestAdded)}
            <MoodMixes />
          </>
        )}
      </div>
    </div>
  );
};
