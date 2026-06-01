const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const { randomUUID } = require('crypto');

// ── S3 client ────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── MIME → category map ───────────────────────────────────────
const getCategory = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'Images';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'Media';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType === 'text/plain'
  ) return 'Documents';
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip' ||
    mimeType === 'application/x-7z-compressed'
  ) return 'Archives';
  if (
    mimeType === 'text/javascript' ||
    mimeType === 'application/json' ||
    mimeType === 'text/html' ||
    mimeType === 'text/css' ||
    mimeType === 'text/x-python' ||
    mimeType === 'application/x-sh'
  ) return 'Code';
  return 'Others';
};

// ── Multer-S3 storage ─────────────────────────────────────────
const storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (_req, file, cb) => {
    cb(null, { originalName: file.originalname });
  },
  key: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const key = `uploads/${randomUUID()}${ext}`;
    cb(null, key);
  },
});

// ── File filter ────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  // Allow all files — category is derived from MIME
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

module.exports = { upload, s3, getCategory };
