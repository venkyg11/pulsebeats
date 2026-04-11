import React, { useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Play, Search, Music, AlertTriangle, LayoutGrid, List as ListIcon } from 'lucide-react';
import { formatDuration } from '../../utils/format';

export const Library: React.FC = () => {
  const { library, isScanning, toggleFavorite, permissionStatus, verifyLibrary, isFileSystemApiSupported } = useFiles();
  const { playSong, currentSong: activeSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'Recent' | 'Most Played' | 'Favorites'>('Recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  let filteredLibrary = library.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sortBy === 'Most Played') {
    filteredLibrary = filteredLibrary.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  } else if (sortBy === 'Favorites') {
    filteredLibrary = filteredLibrary.filter(s => s.isFavorite);
  } else {
    filteredLibrary = filteredLibrary.sort((a, b) => b.addedAt - a.addedAt);
  }

  const hasLegacyData = !isFileSystemApiSupported && library.some(song => !song.fileBlob && song.fileHandle);

  return (
    <div className="view-container">
      {hasLegacyData && (
        <div className="glass-panel" style={{ border: '1px solid var(--primary)', background: 'rgba(255, 100, 0, 0.1)', marginBottom: '24px', padding: '16px', borderRadius: '12px' }}>
          <div className="flex-start" style={{ gap: '16px' }}>
            <AlertTriangle className="text-primary" size={24} style={{ color: '#ff6400' }} />
            <div>
              <h3 style={{ color: '#ff6400', marginBottom: '4px' }}>Legacy Songs Detected</h3>
              <p className="text-muted" style={{ fontSize: '14px' }}>Some songs were imported on a different device and cannot play here. Please <strong>Reset Library</strong> in Settings and re-import your music.</p>
            </div>
          </div>
        </div>
      )}

      <header className="view-header flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="view-header-info">
           <h1 className="text-gradient">Your Library</h1>
           <p className="text-muted" style={{ margin: 0 }}>{filteredLibrary.length} tracks found</p>
        </div>
        <div className="search-box glass-panel" style={{ flex: '1 1 200px', maxWidth: '100%' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search your music..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </header>

      <div className="library-controls flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Recent', 'Most Played', 'Favorites'].map((filter) => (
            <button 
              key={filter}
              className={`library-filter-btn ${sortBy === filter ? 'active' : ''}`}
              onClick={() => setSortBy(filter as any)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             className={`library-filter-btn ${viewMode === 'grid' ? 'active' : ''}`}
             onClick={() => setViewMode('grid')}
             style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
           ><LayoutGrid size={18} /></button>
           <button 
             className={`library-filter-btn ${viewMode === 'list' ? 'active' : ''}`}
             onClick={() => setViewMode('list')}
             style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
           ><ListIcon size={18} /></button>
        </div>
      </div>

      {/* Legacy activation banner removed to simulate native app experience */}

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
        viewMode === 'grid' ? (
          <div className="home-card-grid">
            {filteredLibrary.map((song, idx) => {
              const isActive = activeSong?.id === song.id;
              return (
                <div 
                  key={song.id} 
                  className={`music-card glass-panel ${isActive ? 'playing active-glow' : ''}`}
                  style={{ opacity: song.isUnsupported ? 0.6 : 1 }} 
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
                      {song.isUnsupported && (
                        <span className="badge-new" style={{ background: '#ff3366', color: '#fff' }}>UNSUPPORTED</span>
                      )}
                      <span className="card-duration-tag">{formatDuration(song.duration)}</span>
                    </div>

                    <div className={`card-play-overlay ${isActive ? 'visible' : ''}`}>
                      <div className="play-pulse-icon" />
                    </div>
                  </div>

                  <div className="card-details">
                     <h3 className="card-title" title={song.title}>{song.title}</h3>
                     <p className="card-subtitle" title={song.artist}>{song.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="list-view">
            {filteredLibrary.map((song, idx) => {
              const isActive = activeSong?.id === song.id;
              return (
                <div 
                  key={song.id} 
                  className={`list-item glass-panel ${isActive ? 'playing active-glow' : ''}`}
                  style={{ opacity: song.isUnsupported ? 0.6 : 1, cursor: 'pointer', padding: '8px 12px' }}
                  onClick={() => {
                    const globalIdx = library.findIndex(s => s.id === song.id);
                    playSong(globalIdx, library);
                  }}
                >
                  <div className="list-art" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    {song.coverArt ? (
                      <img src={song.coverArt} alt={song.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="card-art-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={20} />
                      </div>
                    )}
                  </div>
                  <div className="list-meta" style={{ flex: '1 1 auto', minWidth: 0, paddingRight: '8px' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--primary)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                  </div>
                  <div className="list-duration" style={{ flexShrink: 0, fontSize: '13px' }}>
                    {formatDuration(song.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
