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
  const { isBoosted, toggleBoost, equalizerStyle, setEqualizerStyle } = usePlayer();

  const changeTheme = (themeId: string) => {
    document.documentElement.setAttribute('data-theme', themeId !== 'default' ? themeId : '');
  };

  return (
    <div className="floating-settings-popup glass-panel">
      <div className="fsp-header">Quick Settings</div>
      
      <div className="fsp-row">
        <span>Volume Booster</span>
        <button 
          className={`btn-secondary ${isBoosted ? 'active' : ''}`}
          onClick={toggleBoost}
          style={isBoosted ? { background: 'var(--warning)', color: '#fff' } : {}}
        >
          {isBoosted ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="fsp-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <span>Themes</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {themes.map(t => (
            <button 
              key={t.id} 
              className="btn-secondary"
              onClick={() => changeTheme(t.id)}
              style={{ padding: '8px', fontSize: '12px' }}
              title={t.name}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="fsp-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <span>Equalizer Style</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {eqStyles.map(s => (
            <button 
              key={s.id} 
              className={`btn-secondary ${equalizerStyle === s.id ? 'active' : ''}`}
              onClick={() => setEqualizerStyle(s.id)}
              style={{ padding: '8px', fontSize: '12px' }}
              title={s.name}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      <button 
        className="fsp-action"
        onClick={() => {
          scanDirectory();
          onClose();
        }}
        disabled={isScanning}
      >
        <FolderSearch size={20} />
        {isScanning ? 'Importing...' : 'Import Music Folder'}
      </button>
    </div>
  );
};
