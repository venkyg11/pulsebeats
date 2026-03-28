import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize2, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, progress, duration } = usePlayer();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="mini-player glass-panel glow-effect slide-up">
      {/* Top progress line - subtle and clean */}
      <div className="mini-progress-container">
        <div className="mini-progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>
      
      <div className="mini-player-inner">
        <div className="mini-content-group" onClick={onExpand}>
          <div className="mini-art-container">
            {currentSong.coverArt ? (
              <img src={currentSong.coverArt} alt="cover" className="mini-art-img" />
            ) : (
              <div className="mini-art-placeholder">
                <Music size={20} />
              </div>
            )}
          </div>
          
          <div className="mini-song-details">
            <h4 className="mini-title">{currentSong.title}</h4>
            <p className="mini-artist">{currentSong.artist}</p>
          </div>
        </div>

        <div className="mini-actions-group">
          <button className="mini-action-btn" onClick={(e) => { e.stopPropagation(); prevSong(); }} aria-label="Previous">
            <SkipBack size={22} fill="currentColor" />
          </button>
          
          <button className="mini-play-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          
          <button className="mini-action-btn" onClick={(e) => { e.stopPropagation(); nextSong(); }} aria-label="Next">
            <SkipForward size={22} fill="currentColor" />
          </button>

          <button className="mini-expand-btn mobile-hide" onClick={(e) => { e.stopPropagation(); onExpand(); }} aria-label="Expand">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

