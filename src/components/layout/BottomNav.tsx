import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, Heart, Settings, ListMusic } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: <Home size={22} />, label: 'Home' },
    { to: '/playlists', icon: <ListMusic size={22} />, label: 'Playlists' },
    { to: '/library', icon: <Library size={22} />, label: 'Library' },
    { to: '/favorites', icon: <Heart size={24} />, label: 'Favorites' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Settings' },
  ];

  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav-inner glass-panel">
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            className={({ isActive }: { isActive: boolean }) => `nav-item-mobile ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-box">
              {item.icon}
            </div>
            <span className="nav-text-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>

  );
};
