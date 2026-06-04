import React from 'react';
import {
  Video, Image, FileText, Music, Archive, Code, File,
  Copy, ExternalLink, Trash2, Eye
} from 'lucide-react';

const formatBytes = (bytes) => {
  const parsed = Number(bytes);
  if (isNaN(parsed) || parsed <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(parsed) / Math.log(k));
  return parseFloat((parsed / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getIconAndClass = (category, mime = '') => {
  const cat = (category || '').toLowerCase();
  if (mime.startsWith('video/') || cat === 'media' && mime.startsWith('video'))
    return { Icon: Video, cls: 'video', badge: 'badge-video', label: 'VIDEO' };
  if (mime.startsWith('audio/'))
    return { Icon: Music, cls: 'audio', badge: 'badge-media', label: 'AUDIO' };
  if (cat === 'images' || mime.startsWith('image/'))
    return { Icon: Image, cls: 'image', badge: 'badge-image', label: 'IMAGE' };
  if (cat === 'documents')
    return { Icon: FileText, cls: 'doc', badge: 'badge-document', label: 'DOC' };
  if (cat === 'archives')
    return { Icon: Archive, cls: 'archive', badge: 'badge-archive', label: 'ARCHIVE' };
  if (cat === 'code')
    return { Icon: Code, cls: 'code', badge: 'badge-code', label: 'CODE' };
  if (cat === 'media')
    return { Icon: Video, cls: 'video', badge: 'badge-video', label: 'MEDIA' };
  return { Icon: File, cls: 'other', badge: 'badge-others', label: 'FILE' };
};

export default function FileCard({ file, onDelete, onDownload, onPreview }) {
  const { Icon, cls, badge, label } = getIconAndClass(file.category, file.mime_type);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.s3_url);
  };

  return (
    <div className="file-card" id={`file-${file.id}`}>
      <div className="file-card-top">
        <div className={`file-type-icon ${cls}`}>
          <Icon size={18} />
        </div>
        <div className="file-card-meta">
          <div className="file-card-name" title={file.original_name}>
            {file.original_name}
          </div>
          <div className="file-card-info">
            {formatBytes(file.size)} &bull; {formatDate(file.created_at)}
          </div>
        </div>
      </div>

      <div className="file-card-footer">
        <span className={`file-category-badge ${badge}`}>{label}</span>
        <div className="file-actions">
          <button
            className="file-action-btn"
            title="Copy URL"
            onClick={handleCopy}
            id={`copy-${file.id}`}
          >
            <Copy size={13} />
          </button>
          <button
            className="file-action-btn"
            title="Preview"
            onClick={() => onPreview(file.id, file.original_name)}
            id={`preview-${file.id}`}
          >
            <Eye size={13} />
          </button>
          <button
            className="file-action-btn"
            title="Download"
            onClick={() => onDownload(file.id, file.original_name)}
            id={`download-${file.id}`}
          >
            <ExternalLink size={13} />
          </button>
          <button
            className="file-action-btn delete"
            title="Delete"
            onClick={() => onDelete(file.id, file.original_name)}
            id={`delete-${file.id}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
