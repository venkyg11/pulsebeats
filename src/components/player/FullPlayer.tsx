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

      <div className="fp-content">
        {/* 1. Album Art Section */}
        <div className={`fp-art-container ${isPlaying ? 'playing' : ''}`}>
           {currentSong.coverArt ? (
             <img src={currentSong.coverArt} className="fp-art glow-effect" alt="cover" />
           ) : (
             <div className="fp-art fp-placeholder card-fallback-icon" style={{ borderRadius: '20px' }}>
                <Music size={64} />
             </div>
           )}
        </div>

        {/* 2. Visualizer Section (Equalizer) */}
        <div className="fp-equalizer">
          <div className="fp-equalizer-wrapper">
            <Equalizer />
          </div>
        </div>

        {/* 3. Song Info Section with Integrated Buttons */}
        <div className="fp-title-row">
           <button 
              className="action-btn-circle" 
              onClick={() => {
                toggleFavorite(currentSong!.id);
                setIsHeartAnimating(true);
                setTimeout(() => setIsHeartAnimating(false), 400);
              }}
              aria-label="Favorite"
            >
               <Heart 
                 size={24} 
                 className={`heart-icon ${currentSong.isFavorite ? 'active' : ''} ${isHeartAnimating ? 'heart-pop' : ''}`} 
               />
            </button>

            <div className="fp-info">
              <div className="fp-title-artist">
                <h2>{currentSong.title}</h2>
                <p className="fp-artist-text">{currentSong.artist}</p>
              </div>
            </div>

            <div className="fp-volume-wrapper">
               <button 
                className="action-btn-circle" 
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

        {/* 4. Controls & Timeline Section */}
        <div className="fp-controls-main">
          {/* Timeline Row */}
          <div className="timeline">
            <span className="time-display current-time">
              {formatTime(progress)}
            </span>
            <div className="slider-container">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={progress}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="timeline-slider"
                style={{
                  background: `linear-gradient(to right, var(--adaptive-color) ${(progress / (duration || 0.1)) * 100}%, rgba(255, 255, 255, 0.1) ${(progress / (duration || 0.1)) * 100}%)`
                }}
              />
            </div>
            <span className="time-display total-time">{formatTime(duration)}</span>
          </div>

          {/* Main Action Buttons */}
          <div className="main-btns">
            <button 
              className={`ctrl-btn ${isShuffle ? 'active-mode' : ''}`} 
              onClick={toggleShuffle}
              title="Shuffle"
            >
              <Shuffle size={20} />
            </button>
            <button className="ctrl-btn" onClick={prevSong} title="Previous"><SkipBack size={32} /></button>
            <button className="ctrl-btn play-btn glow-effect" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={40} /> : <Play size={40} />}
            </button>
            <button className="ctrl-btn" onClick={nextSong} title="Next"><SkipForward size={32} /></button>
            <button 
              className={`ctrl-btn ${repeatMode !== 'off' ? 'active-mode' : ''}`} 
              onClick={toggleRepeat}
              title="Repeat"
            >
              <Repeat size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
