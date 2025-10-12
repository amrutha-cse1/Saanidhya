const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database');
const { authenticateToken } = require('../auth');
const fetch = require('node-fetch');

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

const upload = multer({ storage });

// POST /api/voices/upload - multipart/form-data file + optional description
// Requires authentication; stores with req.user.id
router.post('/upload', authenticateToken, upload.single('audio'), (req, res) => {
  try {
    const file = req.file;
    const user_id = req.user && req.user.id ? req.user.id : null;
    const description = req.body.description || null;
    const length_seconds = req.body.length_seconds ? parseFloat(req.body.length_seconds) : null;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const { runQuery } = require('../database');
    runQuery('INSERT INTO voice_messages (user_id, filename, original_name, length_seconds, description) VALUES (?,?,?,?,?)', [user_id, file.filename, file.originalname, length_seconds, description])
      .then(result => {
        res.json({ id: result.id, filename: file.filename, original_name: file.originalname });
      }).catch(err => {
        console.error('DB insert voice message failed', err);
        return res.status(500).json({ error: 'DB error' });
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'upload failed' });
  }
});

// GET /api/voices - list voice messages (optional user_id)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const rows = await db.allQuery('SELECT id, user_id, filename, original_name, length_seconds, description, created_at FROM voice_messages WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
    const host = req.headers.host ? req.headers.host : `localhost:5000`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const mapped = rows.map(r => ({ ...r, url: `${protocol}://${host}/api/voices/${r.id}/file` }));
    res.json(mapped);
  } catch (err) {
    console.error('List voices error', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// DELETE /api/voices/:id - delete a voice message (ownership enforced)
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const row = await db.getQuery('SELECT filename, user_id FROM voice_messages WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    // delete DB record
    await db.runQuery('DELETE FROM voice_messages WHERE id = ?', [id]);

    // delete file if exists
    const filePath = path.join(VOICES_DIR, row.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete voice file', e); }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete voice error', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET /api/voices/:id/file - serve the file
router.get('/:id/file', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.getQuery('SELECT filename, original_name, user_id FROM voice_messages WHERE id = ?', [id])
    .then(row => {
      if (!row) return res.status(404).json({ error: 'not found' });
      if (row.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
      const filePath = path.join(VOICES_DIR, row.filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file missing' });
      res.setHeader('Content-Disposition', `inline; filename="${row.original_name || row.filename}"`);
      res.sendFile(filePath);
    }).catch(err => {
      console.error('Serve voice file error', err);
      res.status(500).json({ error: 'DB error' });
    });
});

// POST /api/stt - accepts multipart/form-data audio file, returns transcription (uses OpenAI if configured)
router.post('/stt', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || null;
    if (!OPENAI_KEY) return res.status(501).json({ error: 'STT not available on server (OPENAI_API_KEY not set)' });

    // Call OpenAI whisper transcription endpoint
    const formData = new (require('form-data'))();
    formData.append('file', fs.createReadStream(path.join(VOICES_DIR, file.filename)));
    formData.append('model', 'whisper-1');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: formData,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('openai stt failed', resp.status, txt);
      return res.status(502).json({ error: 'STT provider error', details: txt });
    }
    const data = await resp.json();
    res.json({ transcription: data.text, raw: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'stt failed' });
  }
});

module.exports = router;
