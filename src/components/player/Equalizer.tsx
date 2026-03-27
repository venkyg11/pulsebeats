import React from 'react';
import { usePlayer } from '../../context/PlayerContext';

export const Equalizer: React.FC = () => {
  const { isPlaying, equalizerStyle } = usePlayer();

  const renderClassic = () => (
    <div className="eq-classic" style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end', justifyContent: 'center' }}>
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          className="eq-bar classic-bar"
          style={{
            width: '6px',
            background: 'var(--adaptive-color)',
            boxShadow: '0 0 10px var(--adaptive-color)',
            borderRadius: '2px',
            height: isPlaying ? `${20 + Math.random() * 80}%` : '10%',
            transition: 'height 0.2s ease-in-out',
            animation: isPlaying ? `eqBounce ${0.4 + Math.random() * 0.4}s infinite alternate ease-in-out` : 'none'
          }}
        />
      ))}
    </div>
  );

  const renderDots = () => (
    <div className="eq-dots" style={{ display: 'flex', gap: '8px', height: '40px', alignItems: 'center', justifyContent: 'center' }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', justifyContent: 'center' }}>
          {[...Array(4)].map((_, j) => (
            <div
              key={j}
              className="eq-dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--adaptive-color)',
                boxShadow: '0 0 8px var(--adaptive-color)',
                opacity: isPlaying ? (Math.random() > 0.5 ? 1 : 0.2) : 0.3,
                transition: 'opacity 0.15s ease-in-out'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const renderWave = () => (
    <div className="eq-wave" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="200" height="40" viewBox="0 0 200 40">
        <path
          d={isPlaying ? "M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20" : "M0 20 L 200 20"}
          fill="transparent"
          stroke="var(--adaptive-color)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 5px var(--adaptive-color))',
            transition: 'd 0.3s ease-in-out'
          }}
        >
          {isPlaying && (
            <animate
              attributeName="d"
              dur="1s"
              repeatCount="indefinite"
              values="
                M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20;
                M0 20 Q 25 35, 50 20 T 100 20 T 150 20 T 200 20;
                M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20"
            />
          )}
        </path>
      </svg>
    </div>
  );

  const renderCapsule = () => (
    <div className="eq-capsule" style={{ display: 'flex', gap: '10px', height: '40px', alignItems: 'center', justifyContent: 'center' }}>
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="eq-capsule-bar"
          style={{
            width: '12px',
            background: 'var(--adaptive-color)',
            boxShadow: '0 0 15px var(--adaptive-color)',
            borderRadius: '10px',
            height: isPlaying ? `${30 + Math.random() * 70}%` : '20%',
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 0.8
          }}
        />
      ))}
    </div>
  );

  const renderMirror = () => (
    <div className="eq-mirror" style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'center', justifyContent: 'center' }}>
      {[...Array(20)].map((_, i) => {
        const centerDist = Math.abs(i - 9.5); // Distance from center
        const heightFactor = Math.max(0.2, 1 - centerDist / 10);
        return (
          <div
            key={i}
            className="eq-mirror-bar"
            style={{
              width: '4px',
              background: 'var(--adaptive-color)',
              boxShadow: '0 0 10px var(--adaptive-color)',
              borderRadius: '2px',
              height: isPlaying ? `${(20 + Math.random() * 80) * heightFactor}%` : '5%',
              transition: 'height 0.2s ease'
            }}
          />
        );
      })}
    </div>
  );

  const renderCircular = () => (
    <div className="eq-circular" style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid var(--adaptive-color)',
          borderTopColor: 'transparent',
          boxShadow: '0 0 15px var(--adaptive-color)',
          animation: isPlaying ? 'spin 1s linear infinite' : 'none',
          transition: 'transform 0.3s ease'
        }}
      />
    </div>
  );

  return (
    <div className="equalizer-container" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
      {equalizerStyle === 'classic' && renderClassic()}
      {equalizerStyle === 'dots' && renderDots()}
      {equalizerStyle === 'wave' && renderWave()}
      {equalizerStyle === 'capsule' && renderCapsule()}
      {equalizerStyle === 'mirror' && renderMirror()}
      {equalizerStyle === 'circular' && renderCircular()}
    </div>
  );
};
