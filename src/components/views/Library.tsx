import React, { useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Play, Search, Music, Heart } from 'lucide-react';

export const Library: React.FC = () => {
  const { library, isScanning, toggleFavorite } = useFiles();
  const { playSong, currentSong: activeSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const filteredLibrary = library.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="view-container">
      <header className="view-header flex-between">
        <div className="view-header-info">
           <h1 className="text-gradient">Your Library</h1>
           <p className="text-muted">{filteredLibrary.length} tracks found</p>
        </div>
        <div className="search-box glass-panel">
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search your music..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {isScanning && (
        <div className="scanning-banner glow-effect glass-panel">
          <p>Parsing your music library... This may take a moment.</p>
        </div>
      )}

      {library.length === 0 && !isScanning ? (
         <div className="empty-state glass-panel">
            <h2>Your library is empty</h2>
            <p className="text-muted">Import a folder containing your audio files to get started.</p>
         </div>
      ) : (
        <div className="list-view">
          {filteredLibrary.map((song, idx) => {
            const isActive = activeSong?.id === song.id;
            return (
              <div 
                key={song.id} 
                className={`list-item glass-panel ${isActive ? 'active' : ''}`} 
                onDoubleClick={() => playSong(idx, filteredLibrary)}
              >
                <div className="list-art">
                    {song.coverArt ? <img src={song.coverArt} alt="art" /> : <div className="card-fallback-icon"><Music size={24} /></div>}
                </div>
                <div className="list-meta">
                    <h4>{song.title}</h4>
                </div>
                
                <button 
                  className="list-action-btn heart-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(song.id);
                    setAnimatingId(song.id);
                    setTimeout(() => setAnimatingId(null), 400);
                  }}
                  title={song.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart 
                    size={20} 
                    className={`heart-icon ${song.isFavorite ? 'active' : ''} ${animatingId === song.id ? 'heart-pop' : ''}`} 
                  />
                </button>
                
                <button 
                  className="list-action-btn play-btn" 
                  onClick={() => playSong(idx, filteredLibrary)}
                >
                  <Play size={20} fill={isActive ? "var(--bg-base)" : "none"} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
