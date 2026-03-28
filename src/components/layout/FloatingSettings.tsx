import React from 'react';
import { FolderSearch, Activity, Moon, Sun, Disc, BarChart3, LayoutGrid, Box, GitCompare, Circle, Waves } from 'lucide-react';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';

interface FloatingSettingsProps {
  onClose: () => void;
}

const themes = [
  { id: 'default', name: 'Pulse Cyan', icon: <Activity size={16} /> },
  { id: 'crimson-night', name: 'Crimson Night', icon: <Moon size={16} /> },
  { id: 'purple-wave', name: 'Purple Wave', icon: <Disc size={16} /> },
  { id: 'sunset-neon', name: 'Sunset Neon', icon: <Sun size={16} /> }
];

const eqStyles = [
  { id: 'classic', icon: <BarChart3 size={16} />, name: 'Classic' },
  { id: 'dots', icon: <LayoutGrid size={16} />, name: 'Dots' },
  { id: 'wave', icon: <Waves size={16} />, name: 'Wave' },
  { id: 'capsule', icon: <Box size={16} />, name: 'Capsule' },
  { id: 'mirror', icon: <GitCompare size={16} />, name: 'Mirror' },
  { id: 'circular', icon: <Circle size={16} />, name: 'Circular' }
] as const;

export const FloatingSettings: React.FC<FloatingSettingsProps> = ({ onClose }) => {
  const { scanDirectory, isScanning } = useFiles();
  const { isBoosted, toggleBoost, equalizerStyle, setEqualizerStyle, currentSong } = usePlayer();

  return (
    <div className={`squared-options-panel ${currentSong ? 'is-lifted' : ''}`}>
      <div className="sop-header">Quick Actions</div>
      
      {/* 1st row: Volume Booster */}
      <div className="sop-row">
        <span>Volume Booster</span>
        <button 
          className={`sop-toggle-btn ${isBoosted ? 'active' : ''}`}
          onClick={toggleBoost}
        >
          {isBoosted ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 2nd row: Equalizer Styles */}
      <div className="sop-row-vertical">
        <span>Select Equalizer Animation</span>
        <div className="sop-grid">
          {eqStyles.map(s => (
            <button 
              key={s.id} 
              className={`sop-icon-btn ${equalizerStyle === s.id ? 'active' : ''}`}
              onClick={() => setEqualizerStyle(s.id)}
              title={s.name}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 3rd row: Import Music */}
      <button 
        className="sop-action-btn"
        onClick={() => {
          scanDirectory();
          onClose();
        }}
        disabled={isScanning}
      >
        <FolderSearch size={18} />
        {isScanning ? 'Importing...' : 'Import Music'}
      </button>

      {/* Themes (Optional but integrated) */}
      <div className="sop-row-vertical">
        <span>Themes</span>
        <div className="sop-grid">
          {themes.map(t => (
            <button 
              key={t.id} 
              className="sop-icon-btn"
              onClick={() => {
                document.documentElement.setAttribute('data-theme', t.id !== 'default' ? t.id : '');
              }}
              title={t.name}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
