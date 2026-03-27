import React, { useEffect, useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Play, Music, Clock } from 'lucide-react';
import { formatDuration } from '../../utils/format';

export const ContinueListening: React.FC = () => {
  const { library } = useFiles();
  const { playSong, currentSong: activeSong, isPlaying } = usePlayer();
  const [unfinished, setUnfinished] = useState<any[]>([]);

  useEffect(() => {
    // Filter library for songs with partial progress
    // In a real app, we might fetch fresh from DB to get latest lastPlayedAt
    const items = library
      .filter(s => s.lastProgress && s.lastProgress > 10 && s.lastProgress < s.duration - 10)
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
    setUnfinished(items);
  }, [library]);

  if (unfinished.length === 0) {
    return (
      <div className="view-container">
        <header className="view-header">
          <h1>Continue Listening</h1>
          <p className="text-muted">No unfinished songs found. Start playing some music!</p>
        </header>
      </div>
    );
  }

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>Continue Listening</h1>
        <p className="text-muted">Pick up where you left off</p>
      </header>

      <div className="continue-scroll-container">
        {unfinished.map((song, idx) => {
          const progressPercent = (song.lastProgress / song.duration) * 100;
          const isActive = activeSong?.id === song.id;

          return (
            <div 
              key={song.id} 
              className={`continue-card glass-panel ${isActive ? 'active' : ''}`}
              onClick={() => playSong(idx, unfinished)}
              onMouseEnter={() => {
                // User requested "Hover -> resume instantly"
                if (!isActive || !isPlaying) {
                   playSong(idx, unfinished);
                }
              }}
            >
              <div className="card-art-wrapper">
                {song.coverArt ? (
                  <img src={song.coverArt} alt="art" className="card-art" />
                ) : (
                  <div className="card-art card-fallback-icon"><Music size={40} /></div>
                )}
                <div className="card-overlay">
                  <Play size={32} fill="white" />
                </div>
                
                {/* Visual Progress Bar */}
                <div className="card-progress-track">
                   <div className="card-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="card-info">
                <h4>{song.title}</h4>
                <p>{song.artist}</p>
                <div className="card-meta">
                   <Clock size={12} />
                   <span>{formatDuration(song.lastProgress)}</span>
                   <span style={{ opacity: 0.5 }}>/</span>
                   <span>{formatDuration(song.duration)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
