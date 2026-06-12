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

// ── Lazy storage factory ───────────────────────────────────────
// Storage is created per-request so a missing env var does NOT
// crash the server at startup — it returns a clear error instead.
function getStorage() {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error(
      '[CloudDrop] S3_BUCKET_NAME is not set in your server/.env file.\n' +
      '  Copy .env.example → server/.env and fill in your AWS credentials.\n' +
      '  See README.md → Prerequisites for setup instructions.'
    );
  }

  return multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (_req, file, cb) => {
      // URL-encode metadata values to prevent AWS signature mismatches with special/Unicode characters
      cb(null, { originalName: encodeURIComponent(file.originalname) });
    },
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const key = `uploads/${randomUUID()}${ext}`;
      cb(null, key);
    },
  });
}

// ── File filter ────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  // Allow all files — category is derived from MIME
  cb(null, true);
};

// ── Multer instance (lazy storage) ────────────────────────────
const upload = multer({
  storage: {
    _handleFile(req, file, cb) {
      try {
        const storage = getStorage();
        storage._handleFile(req, file, cb);
      } catch (err) {
        cb(err);
      }
    },
    _removeFile(req, file, cb) {
      try {
        const storage = getStorage();
        storage._removeFile(req, file, cb);
      } catch (err) {
        cb(err);
      }
    },
  },
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

module.exports = { upload, s3, getCategory };
