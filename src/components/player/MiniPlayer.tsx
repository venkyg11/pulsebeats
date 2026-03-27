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
    <div className="mini-player glass-panel glow-effect">
      <div className="mini-progress" style={{ width: `${progressPercent}%` }} />
      
      <div className="mini-content" onClick={onExpand}>
        <div className="mini-art">
          {currentSong.coverArt ? (
            <img src={currentSong.coverArt} alt="cover" />
          ) : (
            <div className="art-placeholder">
              <Music size={20} className="fallback-icon" />
            </div>
          )}
        </div>
        
        <div className="mini-info">
          <h4>{currentSong.title}</h4>
          <p>{currentSong.artist}</p>
        </div>
      </div>

      <div className="mini-controls">
        <button className="control-btn" onClick={prevSong} title="Previous">
          <SkipBack size={20} />
        </button>
        <button className="control-btn play-btn" onClick={togglePlay} title="Play/Pause">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="control-btn" onClick={nextSong} title="Next">
          <SkipForward size={20} />
        </button>
        <button className="control-btn expand-btn" onClick={onExpand} title="Expand">
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
};
