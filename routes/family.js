const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database');
const { authenticateToken } = require('../auth');

const VOICES_DIR = path.join(__dirname, '..', 'cache', 'voices');
if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, VOICES_DIR);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});

// add reasonable file size limit (e.g., 6MB) and accept common audio types
const MAX_UPLOAD_BYTES = parseInt(process.env.FAMILY_UPLOAD_MAX_BYTES || String(6 * 1024 * 1024), 10);
const audioFileFilter = (req, file, cb) => {
  const ok = /audio\//.test(file.mimetype) || /\.(wav|webm|mp3|m4a)$/i.test(file.originalname);
  if (!ok) return cb(new Error('Invalid file type'), false);
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_BYTES }, fileFilter: audioFileFilter });

// Rate limiter for public uploads (per IP) to avoid mass uploads
const rateLimit = require('express-rate-limit');
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.FAMILY_UPLOAD_LIMIT_PER_HOUR || '10', 10),
  message: { error: 'Too many uploads from this IP, please try later' }
});

// Elder creates a family upload token
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { label, expiresInHours } = req.body || {};
    const token = crypto.randomBytes(18).toString('hex');
    let expires_at = null;
    if (expiresInHours) {
      const d = new Date(Date.now() + parseInt(expiresInHours, 10) * 3600 * 1000);
      expires_at = d.toISOString();
    }
    const result = await db.runQuery('INSERT INTO family_upload_tokens (user_id, token, label, expires_at) VALUES (?,?,?,?)', [req.user.id, token, label || null, expires_at]);
    res.json({ token, id: result.id, expires_at });
  } catch (e) {
    console.error('Create family token error', e);
    res.status(500).json({ error: 'failed to create token' });
  }
});

// List tokens for the authenticated elder
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const rows = await db.allQuery('SELECT id, token, label, expires_at, created_at FROM family_upload_tokens WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ tokens: rows });
  } catch (e) {
    console.error('List tokens error', e);
    res.status(500).json({ error: 'failed to list tokens' });
  }
});

// Revoke a token
router.delete('/token/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const row = await db.getQuery('SELECT * FROM family_upload_tokens WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!row) return res.status(404).json({ error: 'token not found' });
    await db.runQuery('DELETE FROM family_upload_tokens WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete token error', e);
    res.status(500).json({ error: 'failed to delete token' });
  }
});

// Public upload using token
router.post('/upload/:token', publicUploadLimiter, upload.single('audio'), async (req, res) => {
  try {
    const token = req.params.token;
    const row = await db.getQuery('SELECT * FROM family_upload_tokens WHERE token = ?', [token]);
    if (!row) return res.status(404).json({ error: 'invalid token' });
    if (row.expires_at && new Date(row.expires_at) < new Date()) return res.status(410).json({ error: 'token expired' });
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'no file uploaded' });

    const desc = req.body.description || null;
    const length_seconds = req.body.length_seconds ? parseFloat(req.body.length_seconds) : null;

    const insert = await db.runQuery('INSERT INTO voice_messages (user_id, filename, original_name, length_seconds, description) VALUES (?,?,?,?,?)', [row.user_id, file.filename, file.originalname, length_seconds, desc]);
    res.json({ id: insert.id, filename: file.filename, original_name: file.originalname });
  } catch (e) {
    console.error('Family upload failed', e);
    res.status(500).json({ error: 'upload failed' });
  }
});

module.exports = router;
