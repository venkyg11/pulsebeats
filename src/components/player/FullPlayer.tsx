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
    <div className="full-player glass-panel slide-up">
      <div className="fp-header">
        <button className="fp-close" onClick={onClose}><ChevronDown size={32} /></button>
        <h3>Now Playing</h3>
        <div style={{ width: '32px' }} /> {/* Spacer */}
      </div>

      <div className="fp-content">
        <div className={`fp-art-container ${isPlaying ? 'playing' : ''}`}>
           {currentSong.coverArt ? (
             <img src={currentSong.coverArt} className="fp-art glow-effect" alt="cover" />
           ) : (
             <div className="fp-art fp-placeholder card-fallback-icon" style={{ borderRadius: '20px' }}>
                <Music size={64} />
             </div>
           )}
        </div>

        <div className="fp-info">
          {/* Animated Equalizer Visualizer */}
          <div className="fp-equalizer-wrapper" style={{ marginTop: 0, marginBottom: '24px' }}>
            <Equalizer />
          </div>
          <div className="fp-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
            
            <div style={{ position: 'absolute', left: 0, bottom: -12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 110 }}>
                <button 
                  className="ctrl-btn" 
                  style={{ background: 'transparent', padding: '8px' }}
                  onClick={() => {
                    toggleFavorite(currentSong.id);
                    setIsHeartAnimating(true);
                    setTimeout(() => setIsHeartAnimating(false), 400);
                  }}
                >
                   <Heart 
                     size={24} 
                     className={`heart-icon ${currentSong.isFavorite ? 'active' : ''} ${isHeartAnimating ? 'heart-pop' : ''}`} 
                   />
                </button>
            </div>

            <h2 style={{ margin: 0, padding: '0 80px', textAlign: 'center' }}>{currentSong.title}</h2>
            
            <div style={{ position: 'absolute', right: 0, bottom: -12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 110 }}>
                <div className={`volume-booster-vertical ${isBoosted ? 'boosted' : ''}`} style={showVolume ? { position: 'absolute', bottom: '40px', right: '0px', zIndex: 110 } : { position: 'relative', height: '40px', padding: '8px', zIndex: 110, width: '40px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                   {isMuted ? (
                     <VolumeX size={24} className="vol-icon" onClick={showVolume ? toggleMute : () => setShowVolume(true)} />
                   ) : (
                     <Volume2 size={24} className="vol-icon" onClick={showVolume ? toggleMute : () => setShowVolume(true)} />
                   )}
                   
                   {showVolume && (
                     <>
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
                           title={`Volume ${Math.round(volume)}%`}
                         />
                       </div>
                       <span className="vol-label">{Math.round(volume)}%</span>
                     </>
                   )}
                </div>
            </div>
          </div>
          <p>{currentSong.artist}</p>
        </div>

        <div className="fp-controls-main">
          <div className="timeline">
            <span style={{ color: 'var(--adaptive-color)', textShadow: '0 0 10px var(--adaptive-color)', fontWeight: '600' }}>
              {formatTime(progress)}
            </span>
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
            <span>{formatTime(duration)}</span>
          </div>

          <div className="main-btns">
            <button className={`ctrl-btn ${isShuffle ? 'active-mode' : ''}`} onClick={toggleShuffle}>
              <Shuffle size={20} />
            </button>
            <button className="ctrl-btn" onClick={prevSong}><SkipBack size={32} /></button>
            <button className="ctrl-btn play-btn glow-effect" onClick={togglePlay}>
              {isPlaying ? <Pause size={40} /> : <Play size={40} />}
            </button>
            <button className="ctrl-btn" onClick={nextSong}><SkipForward size={32} /></button>
            <button className={`ctrl-btn ${repeatMode !== 'off' ? 'active-mode' : ''}`} onClick={toggleRepeat}>
              <Repeat size={20} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
