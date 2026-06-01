const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/uploadMiddleware');
const {
  uploadFile,
  listFiles,
  getStats,
  downloadFile,
  deleteFile,
} = require('../controllers/fileController');

// GET  /api/files/stats
router.get('/stats', getStats);

// GET  /api/files?category=Images&search=photo
router.get('/', listFiles);

// POST /api/files/upload
router.post('/upload', upload.single('file'), uploadFile);

// GET  /api/files/:id/download  → presigned URL
router.get('/:id/download', downloadFile);

// DELETE /api/files/:id
router.delete('/:id', deleteFile);

module.exports = router;
