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
    volume, setVolumeLevel, isMuted, toggleMute, isBoosted,
    // @ts-ignore
    playError
  } = usePlayer();

  const { toggleFavorite } = useFiles();
  const [showVolume, setShowVolume] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (showVolume) {
      timeout = setTimeout(() => setShowVolume(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [showVolume, volume]);

  if (!currentSong) return null;

  return (
    <div className={`full-player slide-up premium-charcoal ${playError !== 'none' ? 'has-error' : ''}`}>
      <div className="fp-header">
        <button className="fp-close" onClick={onClose} aria-label="Close player">
          <ChevronDown size={32} />
        </button>
        <div className="fp-header-title">
          <h3>{playError === 'blocked' ? 'Interaction Required' : 'Now Playing'}</h3>
        </div>
        <div className="fp-header-spacer" />
      </div>

      <div className="fp-main-content">
        {/* 1. Square Album Art Section */}
        <div className={`fp-art-wrapper ${isPlaying ? 'playing' : ''} ${playError !== 'none' ? 'error' : ''}`}>
           {currentSong.coverArt ? (
             <img src={currentSong.coverArt} className="fp-art-image" alt="cover" loading="lazy" />
           ) : (
             <div className="fp-art-image fp-placeholder-centered card-fallback-icon">
                <Music size={80} />
             </div>
           )}
           {playError !== 'none' && (
             <div className="fp-error-overlay">
               <span className="error-msg">
                 {playError === 'blocked' ? 'Tap to play' : 'Format not supported'}
               </span>
             </div>
           )}
        </div>

        {/* 2. Equalizer Section Directly Below Art */}
        <div className="fp-eq-container">
           {playError === 'none' && <Equalizer />}
        </div>

        {/* 3. Song Info Row: [Heart] [Title+Artist] [Speaker] */}
        <div className="fp-info-row">
           <button 
              className={`fp-side-btn heart-btn ${currentSong.isFavorite ? 'active' : ''}`} 
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
                   fill={currentSong.isFavorite ? "currentColor" : "none"}
                   className="heart-icon" 
                 />
               </div>
            </button>

            <div className="fp-text-center">
              <h2 className="fp-title">{currentSong.title}</h2>
              <p className="fp-artist">{currentSong.artist}</p>
            </div>

            <div className="fp-vol-group">
               <button 
                  className={`fp-side-btn vol-toggle ${showVolume ? 'active' : ''}`} 
                  onClick={() => setShowVolume(!showVolume)}
                  aria-label="Volume"
                >
                   {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
               </button>
               
               {showVolume && (
                 <div className={`floating-vol-card ${isBoosted ? 'boosted' : ''}`}>
                    <div className="vol-liquid-container">
                      <div className="vol-threshold-marker" />
                      <div 
                        className={`vol-liquid-wave ${isBoosted ? 'danger' : ''}`} 
                        style={{ height: `${Math.min(100, volume / 2)}%` }} 
                      >
                        <div className={`wave-overlay ${isBoosted ? 'energetic' : ''}`} />
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={200} 
                        value={volume} 
                        onChange={(e) => setVolumeLevel(Number(e.target.value))}
                        className="vol-slider-input"
                      />
                    </div>
                    <span className="vol-percentage">{Math.round(volume)}%</span>
                 </div>
               )}
            </div>
        </div>

        {/* 4. Full-Width Progress Row */}
        <div className="fp-progress-container">
          <div className="fp-progress-labels">
            <span className="time-label">{formatTime(progress)}</span>
            <span className="time-label">{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
          <div className="fp-slider-wrapper">
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={progress}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="fp-progress-slider"
              style={{
                background: duration > 0 
                  ? `linear-gradient(to right, var(--adaptive-color) ${(progress / duration) * 100}%, rgba(255, 255, 255, 0.1) ${(progress / duration) * 100}%)`
                  : 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        </div>

        {/* 5. Playback Controls Row */}
        <div className="fp-controls-row">
          <button 
            className={`fp-small-ctrl ${isShuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={20} />
          </button>
          
          <button className="fp-main-ctrl" onClick={prevSong} title="Previous">
            <SkipBack size={32} fill="currentColor" />
          </button>
          
          <button 
            className={`fp-play-btn-large glow-effect ${playError !== 'none' ? 'error-pulse' : ''}`} 
            onClick={togglePlay} 
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" />}
          </button>
          
          <button className="fp-main-ctrl" onClick={nextSong} title="Next">
            <SkipForward size={32} fill="currentColor" />
          </button>
          
          <button 
            className={`fp-small-ctrl ${repeatMode !== 'off' ? 'active' : ''}`} 
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
