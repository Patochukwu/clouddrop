import React from 'react';

export default function Header({ connected = true }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo-icon">
          {/* Cloud icon SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
        </div>
        <div className="header-title">
          <h1>CloudDrop</h1>
          <span>AWS S3 File Storage Dashboard</span>
        </div>
      </div>

      <div className="cloud-badge">
        <span className="cloud-badge-dot" />
        Cloud {connected ? 'Connected' : 'Disconnected'}
      </div>
    </header>
  );
}
