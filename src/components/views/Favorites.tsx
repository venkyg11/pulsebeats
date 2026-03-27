import React, { useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Play, Music, Heart } from 'lucide-react';
import { formatDuration } from '../../utils/format';

export const Favorites: React.FC = () => {
  const { library, toggleFavorite } = useFiles();
  const { playSong, currentSong: activeSong } = usePlayer();
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const favoriteSongs = library.filter(s => s.isFavorite);

  if (favoriteSongs.length === 0) {
    return (
      <div className="view-container">
        <header className="view-header">
          <h1>Favorites</h1>
          <p className="text-muted">You haven't liked any songs yet.</p>
        </header>
        <div className="empty-state glass-panel">
          <Heart size={48} className="text-muted" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>Tap the heart icon on any song to add it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>Favorites</h1>
        <p className="text-muted">{favoriteSongs.length} liked songs</p>
      </header>

      <div className="list-container">
        {favoriteSongs.map((song, index) => {
          const isActive = activeSong?.id === song.id;
          return (
            <div 
              key={song.id} 
              className={`list-item glass-panel ${isActive ? 'active' : ''}`}
              onDoubleClick={() => playSong(index, favoriteSongs)}
            >
              <div className="list-art">
                {song.coverArt ? (
                  <img src={song.coverArt} alt="art" />
                ) : (
                  <div className="art-placeholder"><Music size={18} /></div>
                )}
              </div>
              <div className="list-meta">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
              </div>
              <div className="list-album">{song.album}</div>
              
              <button 
                className="heart-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(song.id);
                  setAnimatingId(song.id);
                  setTimeout(() => setAnimatingId(null), 400);
                }}
                style={{ background: 'transparent', border: 'none', padding: '8px', cursor: 'pointer' }}
              >
                <Heart 
                  size={20} 
                  className={`heart-icon active ${animatingId === song.id ? 'heart-pop' : ''}`} 
                />
              </button>

              <div className="list-duration">
                {formatDuration(song.duration)}
              </div>
              
              <button className="list-action-btn" onClick={() => playSong(index, favoriteSongs)}>
                <Play size={16} fill="white" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
