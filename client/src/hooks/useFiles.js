import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '../api';
import { toast } from 'react-toastify';

export const useFiles = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await filesApi.getStats();
      setStats(data);
    } catch (_) {}
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (search) params.search = search;
      const { data } = await filesApi.listFiles(params);
      setFiles(data.files);
    } catch (_) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  const refresh = useCallback(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteFile = useCallback(async (id, name) => {
    try {
      await filesApi.deleteFile(id);
      toast.success(`"${name}" deleted`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  }, [refresh]);

  const downloadFile = useCallback(async (id, name) => {
    try {
      const { data } = await filesApi.downloadFile(id, false);
      const a = document.createElement('a');
      a.href = data.url;
      a.download = name;
      a.click();
      toast.success(`Downloading "${name}"`);
    } catch {
      toast.error('Download failed');
    }
  }, []);

  const previewFile = useCallback(async (id, name) => {
    try {
      const { data } = await filesApi.downloadFile(id, true);
      window.open(data.url, '_blank');
      toast.success(`Opening preview for "${name}"`);
    } catch {
      toast.error('Preview failed');
    }
  }, []);

  return {
    files, stats, loading,
    category, setCategory,
    search, setSearch,
    deleteFile, downloadFile, previewFile, refresh,
  };
};
