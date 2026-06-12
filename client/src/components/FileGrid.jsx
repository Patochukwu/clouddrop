import React from "react";
import FileCard from "./FileCard";
import { FolderOpen } from "lucide-react";

export default function FileGrid({
  files,
  loading,
  onDelete,
  onDownload,
  onPreview,
}) {
  if (loading) {
    return (
      <div className="file-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="file-grid">
        <div className="empty-state">
          <FolderOpen size={40} />
          <p>No files found</p>
          <p
            style={{
              fontSize: "0.78rem",
              marginTop: 4,
              color: "var(--text-muted)",
            }}
          >
            Upload yourfile to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-grid">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onDelete={onDelete}
          onDownload={onDownload}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
