import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useFiles } from '../../context/FileContext';
import { usePlayer } from '../../context/PlayerContext';
import { Palette, Trash, RefreshCw, HardDrive, ShieldCheck, PlusCircle, FolderOpen, Clock } from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { rescanAll, library, scanDirectory, verifyLibrary, permissionStatus, isFileSystemApiSupported, handleManualFileSelect } = useFiles();
  const { sleepTimer, setSleepTimer } = usePlayer();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [customTime, setCustomTime] = React.useState('');

  const handleImportClick = () => {
    if (isFileSystemApiSupported) {
      scanDirectory();
    } else {
      fileInputRef.current?.click();
    }
  };

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
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleImportClick}>
            {isFileSystemApiSupported ? <PlusCircle size={18} /> : <FolderOpen size={18} />}
            {isFileSystemApiSupported ? ' Add Music Folder' : ' Select Audio Files'}
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            multiple 
            accept="audio/*" 
            onChange={(e) => {
              if (e.target.files) handleManualFileSelect(e.target.files);
            }}
          />
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



        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} className="text-primary" />
              <div>
                <p className="setting-title" style={{ margin: 0 }}>Sleep Timer</p>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                   {sleepTimer ? `Stops in ${Math.max(1, Math.ceil((sleepTimer - Date.now()) / 60000))} mins` : 'Stop playback after set time'}
                </p>
              </div>
            </div>
            {sleepTimer && (
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 50, 50, 0.2)' }} onClick={() => setSleepTimer(null)}>
                Turn Off
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            {[15, 30, 45].map(min => (
              <button key={min} className="library-filter-btn" style={{ flex: 1, minWidth: '60px', textAlign: 'center', padding: '8px' }} onClick={() => setSleepTimer(min)}>
                {min}m
              </button>
            ))}
            <div style={{ display: 'flex', flex: 1.5, minWidth: '130px', gap: '8px' }}>
              <input 
                 type="number" 
                 placeholder="Mins" 
                 value={customTime}
                 onChange={e => setCustomTime(e.target.value)}
                 style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', padding: '8px', borderRadius: '20px', width: '100%', outline: 'none', textAlign: 'center', fontSize: '13px' }}
              />
              <button className="library-filter-btn" style={{ padding: '8px 12px' }} onClick={() => { if(customTime) { setSleepTimer(parseInt(customTime)); setCustomTime(''); } }}>
                Set
              </button>
            </div>
          </div>
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
