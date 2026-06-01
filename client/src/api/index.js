import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

export const filesApi = {
  getStats: () => api.get('/files/stats'),
  listFiles: (params) => api.get('/files', { params }),
  uploadFile: (formData, onProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }),
  downloadFile: (id, preview = false) => api.get(`/files/${id}/download${preview ? '?preview=true' : ''}`),
  deleteFile: (id) => api.delete(`/files/${id}`),
};

export default api;
