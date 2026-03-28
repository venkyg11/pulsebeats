import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Repeat, Shuffle, Heart, VolumeX, Volume2, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useFiles } from '../../context/FileContext';
import { Equalizer } from './Equalizer';

interface FullPlayerProps {
  onClose: () => void;
}

const formatTime = (time: number) => {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const FullPlayer: React.FC<FullPlayerProps> = ({ onClose }) => {
  const {
    currentSong, isPlaying, progress, duration, togglePlay,
    nextSong, prevSong, seekTo, repeatMode, isShuffle, toggleRepeat, toggleShuffle,
    volume, setVolumeLevel, isMuted, toggleMute, isBoosted
  } = usePlayer();

  const { toggleFavorite } = useFiles();
  const [showVolume, setShowVolume] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (showVolume) {
      timeout = setTimeout(() => setShowVolume(false), 5000);
    }
    return () => clearTimeout(timeout);
  }, [showVolume, volume]);

  if (!currentSong) return null;

  return (
    <div className="full-player slide-up">
      <div className="fp-header">
        <button className="fp-close" onClick={onClose} aria-label="Close player">
          <ChevronDown size={32} />
        </button>
        <h3>Now Playing</h3>
        <div className="fp-header-spacer" />
      </div>

      <div className="fp-main-content">
        {/* 1. Square Album Art Section */}
        <div className={`fp-art-wrapper ${isPlaying ? 'playing' : ''}`}>
           {currentSong.coverArt ? (
             <img src={currentSong.coverArt} className="fp-art-image" alt="cover" />
           ) : (
             <div className="fp-art-image fp-placeholder card-fallback-icon">
                <Music size={80} />
             </div>
           )}
        </div>

        {/* 2. Equalizer Section Directly Below Art */}
        <div className="fp-eq-container">
           <Equalizer />
        </div>

        {/* 3. Song Info Row: [Heart] [Title+Artist] [Speaker] */}
        <div className="fp-info-row">
           <button 
              className="fp-side-btn heart-toggle" 
              onClick={() => {
                toggleFavorite(currentSong!.id);
                setIsHeartAnimating(true);
                setTimeout(() => setIsHeartAnimating(false), 600);
              }}
              aria-label="Favorite"
            >
               <div className={`heart-pop-wrapper ${isHeartAnimating ? 'heart-pop' : ''}`}>
                 <Heart 
                   size={24} 
                   className={`heart-icon ${currentSong.isFavorite ? 'active' : ''}`} 
                 />
               </div>
            </button>

            <div className="fp-text-center">
              <h2>{currentSong.title}</h2>
              <p>{currentSong.artist}</p>
            </div>

            <div className="fp-vol-group">
               <button 
                  className="fp-side-btn speaker-toggle" 
                  onClick={() => setShowVolume(!showVolume)}
                  aria-label="Volume"
                >
                   {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
               </button>
               
               {showVolume && (
                 <div className={`volume-booster-vertical floating-vol-popup ${isBoosted ? 'boosted' : ''}`}>
                    <div className="vol-tube">
                      <div 
                        className={`vol-liquid ${isBoosted ? 'danger' : ''}`} 
                        style={{ height: `${Math.min(100, volume / 2)}%` }} 
                      />
                      <input 
                        type="range" 
                        min={0} 
                        max={200} 
                        value={volume} 
                        onChange={(e) => setVolumeLevel(Number(e.target.value))}
                        className="vol-slider-overlay"
                      />
                    </div>
                    <span className="vol-label">{Math.round(volume)}%</span>
                 </div>
               )}
            </div>
        </div>

        {/* 4. Full-Width Progress Row */}
        <div className="fp-progress-row">
          <span className="time-label">{formatTime(progress)}</span>
          <div className="slider-wrapper">
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={progress}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="fp-progress-slider"
              style={{
                background: `linear-gradient(to right, var(--adaptive-color) ${(progress / (duration || 0.1)) * 100}%, rgba(255, 255, 255, 0.1) ${(progress / (duration || 0.1)) * 100}%)`
              }}
            />
          </div>
          <span className="time-label">{formatTime(duration)}</span>
        </div>

        {/* 5. Playback Controls Row */}
        <div className="fp-controls-row">
          <button 
            className={`fp-ctrl ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={20} />
          </button>
          
          <button className="fp-ctrl" onClick={prevSong} title="Previous">
            <SkipBack size={32} />
          </button>
          
          <button className="fp-play-pause glow-effect" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={42} /> : <Play size={42} />}
          </button>
          
          <button className="fp-ctrl" onClick={nextSong} title="Next">
            <SkipForward size={32} />
          </button>
          
          <button 
            className={`fp-ctrl ${repeatMode !== 'off' ? 'active' : ''}`} 
            onClick={toggleRepeat}
            title="Repeat"
          >
            <Repeat size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
