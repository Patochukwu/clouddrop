const pool = require('../db/pool');
const { s3, getCategory } = require('../middleware/uploadMiddleware');
const { DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// ── Upload file ────────────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, mimetype, size, key, location } = req.file;
    const category = getCategory(mimetype);

    const result = await pool.query(
      `INSERT INTO files (original_name, s3_key, s3_url, mime_type, size, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [originalname, key, location, mimetype, size, category]
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
