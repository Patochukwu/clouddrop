const pool = require('../db/pool');
const { s3, getCategory } = require('../middleware/uploadMiddleware');
const { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

// ── Upload file ────────────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, mimetype, size, key, location } = req.file;
    const category = getCategory(mimetype);

    let fileSize = Number(size || req.body.size);
    if (isNaN(fileSize) || fileSize < 0) {
      fileSize = 0;
    }

    const result = await pool.query(
      `INSERT INTO files (original_name, s3_key, s3_url, mime_type, size, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [originalname, key, location, mimetype, fileSize, category]
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      file: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ── List files ────────────────────────────────────────────────
const listFiles = async (req, res, next) => {
  try {
    // ─── Sync with AWS S3 first ──────────────────────────────
    try {
      const s3Command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: 'uploads/',
      });
      const s3Data = await s3.send(s3Command);
      const s3Objects = (s3Data.Contents || []).filter(item => item.Key !== 'uploads/');

      // Fetch all files currently tracked in the database
      const dbResult = await pool.query('SELECT s3_key FROM files');
      const dbKeys = new Set(dbResult.rows.map(row => row.s3_key));
      const s3Keys = new Set(s3Objects.map(obj => obj.Key));

      // 1. Insert new files found in S3 that are missing from local DB
      for (const obj of s3Objects) {
        if (!dbKeys.has(obj.Key)) {
          const originalName = obj.Key.substring(obj.Key.lastIndexOf('/') + 1);
          const ext = path.extname(originalName).toLowerCase();
          
          // Basic MIME type inference
          let mimeType = 'application/octet-stream';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.mp3') mimeType = 'audio/mpeg';
          else if (ext === '.mp4') mimeType = 'video/mp4';
          else if (ext === '.pdf') mimeType = 'application/pdf';
          else if (ext === '.zip') mimeType = 'application/zip';
          else if (ext === '.txt') mimeType = 'text/plain';

          const category = getCategory(mimeType);
          const location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`;

          await pool.query(
            `INSERT INTO files (original_name, s3_key, s3_url, mime_type, size, category, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [originalName, obj.Key, location, mimeType, obj.Size, category, obj.LastModified]
          );
        }
      }

      // 2. Remove files from local DB that no longer exist in S3
      for (const dbKey of dbKeys) {
        if (!s3Keys.has(dbKey)) {
          await pool.query('DELETE FROM files WHERE s3_key = $1', [dbKey]);
        }
      }
    } catch (s3SyncErr) {
      console.error('⚠️ S3 sync warning (offline or config issue):', s3SyncErr.message);
    }

    // ─── Query database files (as normal) ────────────────────
    const { category, search } = req.query;
    let query = 'SELECT * FROM files';
    const params = [];
    const conditions = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`original_name ILIKE $${params.length}`);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ files: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── Get stats ──────────────────────────────────────────────────
const getStats = async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) AS total_files, COALESCE(SUM(size), 0) AS total_size FROM files'
    );
    const { total_files, total_size } = result.rows[0];
    res.json({
      totalFiles: parseInt(total_files, 10),
      totalSize: parseInt(total_size, 10),
    });
  } catch (err) {
    next(err);
  }
};

// ── Download (presigned URL) ───────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preview } = req.query;
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3_key,
    };

    if (preview === 'true') {
      s3Params.ResponseContentDisposition = 'inline';
      s3Params.ResponseContentType = file.mime_type;
    } else {
      s3Params.ResponseContentDisposition = `attachment; filename="${file.original_name}"`;
    }

    const command = new GetObjectCommand(s3Params);

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (err) {
    next(err);
  }
};

// ── Delete file ────────────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM files WHERE id = $1 RETURNING *',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Remove from S3
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3_key,
    }));

    res.json({ message: 'File deleted successfully', file });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, listFiles, getStats, downloadFile, deleteFile };
