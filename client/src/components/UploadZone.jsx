import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileUp } from 'lucide-react';

const formatBytes = (bytes) => {
  const parsed = Number(bytes);
  if (isNaN(parsed) || parsed <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(parsed) / Math.log(k));
  return parseFloat((parsed / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function UploadZone({ onUpload, uploading, progress }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    await onUpload(selectedFile);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {/* Drop area */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'none' }}
          id="file-input"
        />
        <div className="drop-icon">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="52" height="52">
            <path d="M32 44V24" />
            <path d="M22 34l10-10 10 10" />
            <path d="M48 52H16a8 8 0 0 1 0-16h1a16 16 0 1 1 30.9 4H48a8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <p>
          Drag &amp; drop files here or{' '}
          <span className="browse-link">browse</span>
        </p>
        <p className="drop-hint">Support files up to 50 MB</p>
      </div>

      {/* Selected file preview */}
      {selectedFile && !uploading && (
        <div className="selected-file">
          <FileUp size={15} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
          <span className="selected-file-name">{selectedFile.name}</span>
          <span className="selected-file-size">{formatBytes(selectedFile.size)}</span>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 0, display: 'flex' }}
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Uploading to S3…</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        id="upload-btn"
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
      >
        <Upload size={16} />
        {uploading ? `Uploading… ${progress}%` : 'Upload to AWS S3'}
      </button>
    </div>
  );
}
