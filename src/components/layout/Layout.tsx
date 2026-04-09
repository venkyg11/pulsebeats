import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Settings, Plus } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from '../player/MiniPlayer';
import { FullPlayer } from '../player/FullPlayer';
import { FloatingSettings } from './FloatingSettings';
import { usePlayer } from '../../context/PlayerContext';
import { useFiles } from '../../context/FileContext';

export const Layout: React.FC = () => {
  const { 
    currentSong, togglePlay, nextSong, prevSong, 
    volume, setVolumeLevel, seekTo, progress 
  } = usePlayer();
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { scanDirectory, isScanning } = useFiles();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) nextSong();
          else seekTo(progress + 5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) prevSong();
          else seekTo(Math.max(0, progress - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolumeLevel(volume + 5);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolumeLevel(volume - 5);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextSong, prevSong, volume, setVolumeLevel, seekTo, progress]);

  return (
    <div className="app-layout">
      {/* Background with animated particles or simple gradient */}
      <div className="ambient-background">
        <div className="particles-container">
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={i} 
              className="particle" 
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${Math.random() * 10 + 10}s`
              }} 
            />
          ))}
        </div>
      </div>

      <main className="main-content">
        <div className="scroll-container">
          <Outlet />
        </div>
      </main>

      <BottomNav />

      {/* Players */}
      {currentSong && (
        <MiniPlayer onExpand={() => setIsFullPlayerOpen(true)} />
      )}

      {isFullPlayerOpen && currentSong && (
        <FullPlayer onClose={() => setIsFullPlayerOpen(false)} />
      )}

      {/* Floating Settings/Options Panel */}
      {isSettingsOpen && (
        <FloatingSettings onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Main Floating Action Button */}
      {!isFullPlayerOpen && (
        <button 
          className={`fab-button glow-effect ${currentSong ? 'fab-lifted' : ''} ${isSettingsOpen ? 'is-active' : ''}`}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Quick Settings"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};
