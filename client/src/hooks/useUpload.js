import { useState, useCallback } from 'react';
import { filesApi } from '../api';
import { toast } from 'react-toastify';

export const useUpload = (onSuccess) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await filesApi.uploadFile(formData, setProgress);
      toast.success(`"${file.name}" uploaded successfully!`);
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Check your AWS config.';
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onSuccess]);

  return { upload, uploading, progress };
};
