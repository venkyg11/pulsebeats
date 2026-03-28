import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useFiles } from '../../context/FileContext';
import { Palette, Trash, RefreshCw, HardDrive, ShieldCheck, PlusCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { rescanAll, library, scanDirectory, verifyLibrary, permissionStatus } = useFiles();

  const themes = [
    { id: 'electric-blue', name: 'Electric Blue', style: { background: '#050505', color: '#00f3ff' } },
    { id: 'crimson-night', name: 'Crimson Night', style: { background: '#0a0505', color: '#ff003c' } },
    { id: 'purple-wave', name: 'Purple Wave', style: { background: '#08030d', color: '#b026ff' } },
    { id: 'emerald-pulse', name: 'Emerald Pulse', style: { background: '#030a06', color: '#00ff66' } },
    { id: 'sunset-neon', name: 'Sunset Neon', style: { background: '#0a0603', color: '#ff5e00' } },
    { id: 'minimal-dark', name: 'Minimal Dark', style: { background: '#0f0f11', color: '#e0e0e0' } }
  ];

  return (
    <div className="view-container">
      <header className="view-header">
        <h1>Settings</h1>
        <p className="text-muted">Customize your Pulse Beats experience</p>
      </header>

      <section className="settings-section glass-panel">
        <div className="section-header">
          <Palette size={24} className="text-primary" />
          <h2>Theme Studio</h2>
        </div>
        <div className="theme-grid">
          {themes.map((t) => (
            <div 
              key={t.id} 
              className={`theme-card ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id as any)}
            >
              <div className="theme-preview" style={t.style}>
                <div className="theme-accent" />
              </div>
              <p>{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section glass-panel">
        <div className="section-header">
          <HardDrive size={24} className="text-primary" />
          <h2>Music Library</h2>
        </div>
        
        <div className="setting-row">
          <div>
            <p className="setting-title">Import Music</p>
            <p className="text-muted">Scan a local folder to add tracks to your library</p>
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={scanDirectory}>
            <PlusCircle size={18} /> Add Music Folder
          </button>
        </div>

        {library.length > 0 && permissionStatus !== 'granted' && (
          <div className="setting-row" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
            <div>
              <p className="setting-title text-primary">Activate Library Access</p>
              <p className="text-muted" style={{ fontSize: '13px' }}>Required once per session to enable instant playback.</p>
            </div>
            <button className="btn-secondary" style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={verifyLibrary}>
              <ShieldCheck size={18} /> Verify Access
            </button>
          </div>
        )}

        <div className="setting-row">
          <div>
            <p className="setting-title">Local Data</p>
            <p className="text-muted">Stored metadata for {library.length} songs</p>
          </div>
          <button className="btn-secondary" style={{ opacity: 0.6 }} onClick={rescanAll}>
            <Trash size={18} /> Reset Library
          </button>
        </div>
      </section>
      
      <section className="settings-section glass-panel">
        <div className="section-header">
          <RefreshCw size={24} className="text-primary" />
          <h2>About Pulse Beats</h2>
        </div>
        <p className="text-muted">Version 1.1.0 - Premium futuristic music player with instant playback.</p>
      </section>
    </div>
  );
};
