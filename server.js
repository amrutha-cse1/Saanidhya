// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // or change to '.env' if you keep it inside murf-backend

// If you're on Node < 18, install and uncomment:
// const fetch = require('node-fetch');

// Initialize database
require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const moodRoutes = require('./routes/mood');
const memoryRoutes = require('./routes/memory');
const emergencyRoutes = require('./routes/emergency');
const newsRoutes = require('./routes/news');
const devotionalRoutes = require('./routes/devotional');
const chatRoutes = require('./routes/chat');
const voicesRoutes = require('./routes/voices');
const familyRoutes = require('./routes/family');
const weatherRoutes = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 5000;
const http = require('http');
const WebSocket = require('ws');

const MURF_API_KEY = process.env.MURF_API_KEY;
const DEFAULT_VOICE_ID = process.env.MURF_VOICE_ID || 'en-IN-arohi';

if (!MURF_API_KEY) {
  console.warn('[WARN] MURF_API_KEY is not set. /speak and websocket TTS will log a warning.');
}

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/devotional', devotionalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/voices', voicesRoutes);
app.use('/api/weather', weatherRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Create HTTP server and attach WebSocket server for TTS streaming
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const cache = require('./cache');
const { startRunner } = require('./reminderRunner');

// Simple sentiment endpoint (transcript-based)
app.post('/api/sentiment', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    if (!transcript || typeof transcript !== 'string') return res.status(400).json({ error: 'transcript is required' });

    // Very small heuristic sentiment (placeholder for more advanced ML)
    const t = transcript.toLowerCase();
    let score = 0; // -1 negative, 0 neutral, +1 positive
    const positive = ['happy', 'good', 'great', 'well', 'better', 'ok', 'fine', 'love'];
    const negative = ['sad', 'depressed', 'tired', 'bad', 'lonely', 'hurt', 'upset', "don't"]; // simple tokens

    for (const p of positive) if (t.includes(p)) score++;
    for (const n of negative) if (t.includes(n)) score--;

    let sentiment = 'neutral';
    if (score > 0) sentiment = 'positive';
    else if (score < 0) sentiment = 'negative';

    return res.json({ sentiment, score });
  } catch (err) {
    console.error('Sentiment error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket TTS handler
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { text, voiceId } = payload;

      if (!text) {
        ws.send(JSON.stringify({ error: 'text is required' }));
        return;
      }

      if (!MURF_API_KEY) {
        ws.send(JSON.stringify({ error: 'MURF_API_KEY missing on server' }));
        return;
      }

      const selectedVoiceId = (typeof voiceId === 'string' && voiceId.includes('-')) ? voiceId : DEFAULT_VOICE_ID;

      // Try cache first
      const key = cache.makeKey(text, selectedVoiceId);
      if (cache.has(key)) {
        const cached = cache.read(key);
        if (cached?.encodedAudio) {
          const base64 = cached.encodedAudio;
          const chunkSize = 64 * 1024;
          for (let i = 0; i < base64.length; i += chunkSize) {
            const chunk = base64.slice(i, i + chunkSize);
            ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
          }
          ws.send(JSON.stringify({ type: 'done', format: 'audio/mpeg', cached: true }));
          return;
        }
        if (cached?.audioFile) {
          ws.send(JSON.stringify({ type: 'url', url: cached.audioFile, cached: true }));
          return;
        }
      }

      const murfPayload = {
        text,
        voiceId: selectedVoiceId,
        format: 'mp3',
        modelVersion: 'GEN2',
        sampleRate: 44100,
        encodeAsBase64: true
      };

      const response = await fetch('https://api.murf.ai/v1/speech/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': MURF_API_KEY
        },
        body: JSON.stringify(murfPayload)
      });

      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = raw; }

      if (!response.ok) {
        ws.send(JSON.stringify({ error: data?.errorMessage || data?.message || 'Murf API error', details: data }));
        return;
      }

      // write to cache
      try { cache.write(key, data); } catch (e) { /* ignore cache failures */ }

      if (data?.encodedAudio) {
        const base64 = data.encodedAudio;
        const chunkSize = 64 * 1024; // 64KB
        for (let i = 0; i < base64.length; i += chunkSize) {
          const chunk = base64.slice(i, i + chunkSize);
          ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
        }
        ws.send(JSON.stringify({ type: 'done', format: 'audio/mpeg' }));
      } else if (data?.audioFile) {
        ws.send(JSON.stringify({ type: 'url', url: data.audioFile }));
      } else {
        ws.send(JSON.stringify({ error: 'No audio data from Murf', details: data }));
      }

    } catch (err) {
      console.error('WS processing error:', err);
      try { ws.send(JSON.stringify({ error: 'Internal server error' })); } catch (e) {}
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  const { url } = request;
  if (url === '/ws-tts') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// REST /speak endpoint (Murf TTS via REST)
app.post('/speak', async (req, res) => {
  try {
    const { text, voiceId } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });
    if (!MURF_API_KEY) return res.status(500).json({ error: 'MURF_API_KEY missing on server' });

    const selectedVoiceId = (typeof voiceId === 'string' && voiceId.includes('-')) ? voiceId : DEFAULT_VOICE_ID;

    // Try cache first (note: REST endpoint requests non-base64 URL from Murf)
    const key = cache.makeKey(text, selectedVoiceId);
    if (cache.has(key)) {
      const cached = cache.read(key);
      if (cached?.audioFile) return res.json({ audioUrl: cached.audioFile, cached: true });
      if (cached?.encodedAudio) return res.json({ audioUrl: `data:audio/mpeg;base64,${cached.encodedAudio}`, cached: true });
    }

    const payload = { text, voiceId: selectedVoiceId, format: 'mp3', modelVersion: 'GEN2', sampleRate: 44100, encodeAsBase64: false };

    const response = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': MURF_API_KEY },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }

    if (!response.ok) return res.status(response.status).json({ error: data?.errorMessage || data?.message || 'Murf API error', details: data });

    // write to cache
    try { cache.write(key, data); } catch (e) { /* ignore */ }

    const audioUrl = data?.audioFile || (data?.encodedAudio ? `data:audio/mpeg;base64,${data.encodedAudio}` : null);
    if (!audioUrl) return res.status(500).json({ error: 'audioUrl not found in Murf response', details: data });

    return res.json({ audioUrl });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\u2705 Server running on http://localhost:${PORT}`);
  console.log('⚡ WebSocket TTS available at ws://localhost:' + PORT + '/ws-tts');
});

// Optionally start server-side reminders
if (process.env.ENABLE_SERVER_REMINDERS === 'true') {
  const baseUrl = `http://localhost:${PORT}`;
  startRunner(baseUrl);
}
