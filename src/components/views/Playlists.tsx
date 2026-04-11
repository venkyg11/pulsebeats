import React, { useState } from 'react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { ListMusic, Plus, Trash, Play, Music, ArrowLeft, CheckSquare, Square } from 'lucide-react';

export const Playlists: React.FC = () => {
  const { playlists, library, createPlaylist, deletePlaylist, removeSongFromPlaylist } = useFiles();
  const { playSong, currentSong: activeSong } = usePlayer();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  const [isCreatingName, setIsCreatingName] = useState<string | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());

  const handleStartCreate = () => {
    if (newPlaylistName.trim()) {
      setIsCreatingName(newPlaylistName.trim());
      setSelectedSongs(new Set());
    }
  };

  const handleSavePlaylist = async () => {
    if (isCreatingName) {
      try {
        await createPlaylist(isCreatingName, Array.from(selectedSongs));
        setIsCreatingName(null);
        setNewPlaylistName('');
        setSelectedSongs(new Set());
      } catch (e) {
        console.error('Failed to create playlist', e);
        alert(`Playlist save failed: ${e}`);
      }
    }
  };

  if (isCreatingName) {
    return (
      <div className="view-container">
        <header className="view-header" style={{ marginBottom: '24px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setIsCreatingName(null)}
            style={{ marginBottom: '16px', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={18} style={{ marginRight: '8px' }}/> Cancel
          </button>
          <div className="flex-between">
            <div>
              <h1 className="text-gradient">Add Songs</h1>
              <p className="text-muted" style={{ margin: 0 }}>Select songs for "{isCreatingName}"</p>
            </div>
            <button 
              className="btn-primary"
              onClick={handleSavePlaylist}
              style={{ padding: '8px 24px', borderRadius: '20px' }}
              disabled={false}
            >
              Save Playlist
            </button>
          </div>
        </header>

        <div className="list-view">
          {library.map((song, idx) => {
            const isSelected = selectedSongs.has(song.id);
            return (
              <div 
                key={song.id + '-' + idx} 
                className={`list-item glass-panel ${isSelected ? 'active-glow' : ''}`}
                style={{ opacity: song.isUnsupported ? 0.6 : 1, cursor: 'pointer', padding: '8px 12px' }}
                onClick={() => {
                  const newSet = new Set(selectedSongs);
                  if (newSet.has(song.id)) newSet.delete(song.id);
                  else newSet.add(song.id);
                  setSelectedSongs(newSet);
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
                <div className="list-meta" style={{ flex: '1 1 auto', minWidth: 0, paddingRight: '12px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--primary)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                </div>
                <div style={{ padding: '8px', zIndex: 10, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                   {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  if (selectedPlaylist) {
    const playlistSongs = selectedPlaylist.songIds.map(id => library.find(s => s.id === id)).filter(Boolean) as typeof library;
    
    return (
      <div className="view-container">
        <header className="view-header" style={{ marginBottom: '24px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setSelectedPlaylistId(null)}
            style={{ marginBottom: '16px', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={18} style={{ marginRight: '8px' }}/> Back to Playlists
          </button>
          <div className="flex-between">
            <div>
              <h1 className="text-gradient">{selectedPlaylist.name}</h1>
              <p className="text-muted" style={{ margin: 0 }}>{playlistSongs.length} tracks</p>
            </div>
            {playlistSongs.length > 0 && (
              <button 
                className="btn-primary"
                onClick={() => playSong(0, playlistSongs)}
                style={{ borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--primary-glow)' }}
              >
                <Play size={24} fill="currentColor" />
              </button>
            )}
          </div>
        </header>

        {playlistSongs.length === 0 ? (
          <div className="empty-state glass-panel">
            <h2>This playlist is empty</h2>
            <p className="text-muted">Go to your library to add songs to "{selectedPlaylist.name}".</p>
          </div>
        ) : (
          <div className="list-view">
            {playlistSongs.map((song, idx) => {
              const isActive = activeSong?.id === song.id;
              return (
                <div 
                  key={song.id + '-' + idx} 
                  className={`list-item glass-panel ${isActive ? 'playing active-glow' : ''}`}
                  style={{ opacity: song.isUnsupported ? 0.6 : 1, cursor: 'pointer', padding: '8px 12px' }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('.remove-btn')) {
                      playSong(idx, playlistSongs);
                    }
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
                  <div className="list-meta" style={{ flex: '1 1 auto', minWidth: 0, paddingRight: '12px' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--primary)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                  </div>
                  <button 
                    className="remove-btn" 
                    onClick={() => removeSongFromPlaylist(selectedPlaylist.id, song.id)}
                    style={{ padding: '8px', zIndex: 10, background: 'rgba(255, 50, 50, 0.1)', color: '#ff3366', borderRadius: '50%' }}
                    title="Remove from playlist"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="view-container">
      <header className="view-header">
        <h1 className="text-gradient">Your Playlists</h1>
        <p className="text-muted">Create and manage your custom mixes</p>
      </header>

      <div className="glass-panel" style={{ padding: '16px', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="New playlist name..." 
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStartCreate()}
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', padding: '12px 16px', borderRadius: '12px', outline: 'none' }}
        />
        <button 
          className="btn-primary" 
          onClick={handleStartCreate}
          disabled={!newPlaylistName.trim()}
          style={{ height: '44px', width: '44px', padding: 0, borderRadius: '12px', opacity: newPlaylistName.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={20} />
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="empty-state glass-panel">
          <ListMusic size={48} className="text-primary" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h2>No playlists yet</h2>
          <p className="text-muted">Create your first playlist above.</p>
        </div>
      ) : (
        <div className="home-card-grid">
          {playlists.map((playlist) => {
            const songCount = playlist.songIds.length;
            const firstSongId = playlist.songIds[0];
            const firstSong = firstSongId ? library.find(s => s.id === firstSongId) : null;
            
            return (
              <div 
                key={playlist.id} 
                className="music-card glass-panel"
                onClick={() => setSelectedPlaylistId(playlist.id)}
              >
                <div className="card-art-container">
                  {firstSong?.coverArt ? (
                    <img src={firstSong.coverArt} alt={playlist.name} className="card-art-img" loading="lazy" />
                  ) : (
                    <div className="card-art-placeholder">
                      <ListMusic size={32} />
                    </div>
                  )}
                  <div className="card-play-overlay">
                    <div className="play-pulse-icon" style={{ borderRadius: '12px', width: 'auto', padding: '8px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                      View
                    </div>
                  </div>
                </div>
                <div className="card-details" style={{ marginTop: '12px' }}>
                  <div className="flex-between">
                     <h3 className="card-title" title={playlist.name}>{playlist.name}</h3>
                     <button 
                       className="text-muted" 
                       onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist.id); }}
                       style={{ padding: '8px', marginRight: '-8px' }}
                     >
                       <Trash size={14} />
                     </button>
                  </div>
                  <p className="card-subtitle">{songCount} {songCount === 1 ? 'track' : 'tracks'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
