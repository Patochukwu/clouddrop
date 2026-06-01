import React from 'react';
import { FileText, HardDrive } from 'lucide-react';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function StatsRow({ stats }) {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon files">
          <FileText size={22} />
        </div>
        <div className="stat-info">
          <label>Total Files</label>
          <div className="stat-value">{stats.totalFiles}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon storage">
          <HardDrive size={22} />
        </div>
        <div className="stat-info">
          <label>Storage Used</label>
          <div className="stat-value">{formatBytes(stats.totalSize)}</div>
        </div>
      </div>
    </div>
  );
}
