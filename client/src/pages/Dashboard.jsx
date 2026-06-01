import React from 'react';
import Header from '../components/Header';
import StatsRow from '../components/StatsRow';
import UploadZone from '../components/UploadZone';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import FileGrid from '../components/FileGrid';
import { useFiles } from '../hooks/useFiles';
import { useUpload } from '../hooks/useUpload';
import { FolderOpen, Upload } from 'lucide-react';

export default function Dashboard() {
  const {
    files, stats, loading,
    category, setCategory,
    search, setSearch,
    deleteFile, downloadFile, previewFile, refresh,
  } = useFiles();

  const { upload, uploading, progress } = useUpload(refresh);

  return (
    <div className="app-wrapper">
      <Header connected={true} />

      <main className="main-content">
        {/* ── Stats ── */}
        <StatsRow stats={stats} />

        {/* ── Main grid ── */}
        <div className="dashboard-grid">

          {/* ── Upload panel ── */}
          <div className="panel">
            <div className="panel-title">
              <Upload size={16} />
              Upload File
            </div>
            <UploadZone
              onUpload={upload}
              uploading={uploading}
              progress={progress}
            />
          </div>

          {/* ── Files panel ── */}
          <div className="panel">
            <div className="panel-title">
              <FolderOpen size={16} />
              Files Storage
            </div>

            <SearchBar value={search} onChange={setSearch} />
            <CategoryTabs active={category} onChange={setCategory} />
            <FileGrid
              files={files}
              loading={loading}
              onDelete={deleteFile}
              onDownload={downloadFile}
              onPreview={previewFile}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
