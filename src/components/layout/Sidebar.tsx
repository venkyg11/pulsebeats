import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, Disc, Heart, Clock, Settings, PlayCircle } from 'lucide-react';
import logo from '../../assets/logo.png';

export const Sidebar: React.FC = () => {
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <img src={logo} alt="PulseBeats Logo" className="sidebar-logo" />
        <h2 className="brand text-gradient">{greeting}</h2>
        <p className="tagline">built by venky</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <p className="nav-title">Menu</p>
          <NavLink to="/" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} /> <span>Home</span>
          </NavLink>
          <NavLink to="/continue" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <PlayCircle size={20} /> <span>Continue Listening</span>
          </NavLink>
        </div>

        <div className="nav-section">
          <p className="nav-title">Your Collection</p>
          <NavLink to="/library" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Library size={20} /> <span>Library</span>
          </NavLink>
          <NavLink to="/playlists" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Disc size={20} /> <span>Playlists</span>
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Heart size={20} /> <span>Favorites</span>
          </NavLink>
          <NavLink to="/recent" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Clock size={20} /> <span>Recently Played</span>
          </NavLink>
        </div>

        <div className="nav-bottom">
          <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={20} /> <span>Settings</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};
