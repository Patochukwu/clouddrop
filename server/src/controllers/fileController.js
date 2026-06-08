const pool = require('../db/pool');
const { s3, getCategory } = require('../middleware/uploadMiddleware');
const { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

// Helper to check if database is configured
const isDbEnabled = () => {
  return !!process.env.DATABASE_URL;
};

// Helper to encode S3 key as a safe URL parameter ID
const keyToId = (key) => Buffer.from(key).toString('hex');

// Helper to decode a hex ID back to S3 key
const idToKey = (id) => {
  try {
    if (id.length > 20 && /^[0-9a-fA-F]+$/.test(id)) {
      return Buffer.from(id, 'hex').toString('utf-8');
    }
  } catch (e) {}
  return id;
};

// Helper to infer mime type from file extension
const inferMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.zip') return 'application/zip';
  if (ext === '.txt') return 'text/plain';
  return 'application/octet-stream';
};

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

    let fileData;

    if (isDbEnabled()) {
      try {
        const result = await pool.query(
          `INSERT INTO files (original_name, s3_key, s3_url, mime_type, size, category)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [originalname, key, location, mimetype, fileSize, category]
        );
        fileData = result.rows[0];
      } catch (dbErr) {
        console.error('⚠️ DB Insert failed, falling back to S3-Only return structure:', dbErr.message);
      }
    }

    if (!fileData) {
      fileData = {
        id: keyToId(key),
        original_name: originalname,
        s3_key: key,
        s3_url: location,
        mime_type: mimetype,
        size: fileSize,
        category: category,
        created_at: new Date().toISOString(),
      };
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileData,
    });
  } catch (err) {
    next(err);
  }
};

// ── List files ────────────────────────────────────────────────
const listFiles = async (req, res, next) => {
  try {
    // ─── Return Output from DB immediately (super fast) ───
    const { category, search } = req.query;

    if (isDbEnabled()) {
      // ─── Background Sync S3 to DB (Prevents API Lag) ───
      (async () => {
        try {
          const s3Command = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: 'uploads/',
          });
          const s3Data = await s3.send(s3Command);
          const s3Objects = (s3Data.Contents || []).filter(item => item.Key !== 'uploads/');

          const dbResult = await pool.query('SELECT s3_key FROM files');
          const dbKeys = new Set(dbResult.rows.map(row => row.s3_key));
          const s3Keys = new Set(s3Objects.map(obj => obj.Key));

          // Insert missing keys
          for (const obj of s3Objects) {
            if (!dbKeys.has(obj.Key)) {
              const originalName = obj.Key.substring(obj.Key.lastIndexOf('/') + 1);
              const mimeType = inferMimeType(originalName);
              const fileCat = getCategory(mimeType);
              const location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`;
              const fileSize = Number(obj.Size || 0);

              await pool.query(
                `INSERT INTO files (original_name, s3_key, s3_url, mime_type, size, category, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (s3_key) DO NOTHING`,
                [originalName, obj.Key, location, mimeType, fileSize, fileCat, obj.LastModified]
              );
            }
          }

          // Delete keys not in S3
          for (const dbKey of dbKeys) {
            if (!s3Keys.has(dbKey)) {
              await pool.query('DELETE FROM files WHERE s3_key = $1', [dbKey]);
            }
          }
        } catch (syncErr) {
          console.error('⚠️ Background DB Sync failed:', syncErr.message);
        }
      })();

      try {
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
        return res.json({ files: result.rows });
      } catch (dbQueryErr) {
        console.error('⚠️ DB Query failed, falling back to direct S3 listings:', dbQueryErr.message);
      }
    }

    // Direct S3 fallback listing
    let filesList = s3Objects.map(obj => {
      const originalName = obj.Key.substring(obj.Key.lastIndexOf('/') + 1);
      const mimeType = inferMimeType(originalName);
      return {
        id: keyToId(obj.Key),
        original_name: originalName,
        s3_key: obj.Key,
        s3_url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`,
        mime_type: mimeType,
        size: Number(obj.Size || 0),
        category: getCategory(mimeType),
        created_at: obj.LastModified,
      };
    });

    if (category && category !== 'All') {
      filesList = filesList.filter(f => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      filesList = filesList.filter(f => f.original_name.toLowerCase().includes(search.toLowerCase()));
    }

    filesList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ files: filesList });
  } catch (err) {
    next(err);
  }
};

// ── Get stats ──────────────────────────────────────────────────
const getStats = async (_req, res, next) => {
  try {
    if (isDbEnabled()) {
      try {
        const result = await pool.query(
          'SELECT COUNT(*)::integer AS total_files, COALESCE(SUM(size), 0)::bigint AS total_size FROM files'
        );
        const { total_files, total_size } = result.rows[0];
        return res.json({
          totalFiles: Number(total_files || 0),
          totalSize: Number(total_size || 0),
        });
      } catch (dbErr) {
        console.error('⚠️ DB Stats query failed:', dbErr.message);
      }
    }

    // Direct S3 fallback stats
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'uploads/',
    });
    const s3Data = await s3.send(command);
    const s3Objects = (s3Data.Contents || []).filter(item => item.Key !== 'uploads/');

    const totalFiles = s3Objects.length;
    const totalSize = s3Objects.reduce((acc, item) => acc + Number(item.Size || 0), 0);

    res.json({ totalFiles, totalSize });
  } catch (err) {
    next(err);
  }
};

// ── Download (presigned URL) ───────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preview } = req.query;
    let s3Key = '';
    let originalName = '';
    let mimeType = 'application/octet-stream';

    if (isDbEnabled()) {
      try {
        const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
        if (result.rows.length) {
          const file = result.rows[0];
          s3Key = file.s3_key;
          originalName = file.original_name;
          mimeType = file.mime_type;
        }
      } catch (dbErr) {
        console.error('⚠️ DB download query failed:', dbErr.message);
      }
    }

    if (!s3Key) {
      s3Key = idToKey(id);
      originalName = s3Key.substring(s3Key.lastIndexOf('/') + 1);
      mimeType = inferMimeType(originalName);
    }

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    };

    if (preview === 'true') {
      s3Params.ResponseContentDisposition = 'inline';
      s3Params.ResponseContentType = mimeType;
    } else {
      s3Params.ResponseContentDisposition = `attachment; filename="${originalName}"`;
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
    let s3Key = '';
    let deletedFile = null;

    if (isDbEnabled()) {
      try {
        const result = await pool.query(
          'DELETE FROM files WHERE id = $1 RETURNING *',
          [id]
        );
        if (result.rows.length) {
          deletedFile = result.rows[0];
          s3Key = deletedFile.s3_key;
        }
      } catch (dbErr) {
        console.error('⚠️ DB delete query failed:', dbErr.message);
      }
    }

    if (!s3Key) {
      s3Key = idToKey(id);
      deletedFile = {
        id,
        s3_key: s3Key,
        original_name: s3Key.substring(s3Key.lastIndexOf('/') + 1),
      };
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    }));

    res.json({ message: 'File deleted successfully', file: deletedFile });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, listFiles, getStats, downloadFile, deleteFile };
