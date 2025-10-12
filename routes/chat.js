const express = require('express');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Simple in-memory per-user rate limiter (requests per minute)
const RATE_LIMIT_PER_MIN = parseInt(process.env.CHAT_RATE_LIMIT_PER_MIN || '20', 10);
const userRateMap = new Map(); // userId -> { count, windowStart }

function checkRateLimit(userId) {
  const now = Date.now();
  const win = 60 * 1000;
  const info = userRateMap.get(userId) || { count: 0, windowStart: now };
  if (now - info.windowStart > win) {
    info.count = 0;
    info.windowStart = now;
  }
  info.count += 1;
  userRateMap.set(userId, info);
  return info.count <= RATE_LIMIT_PER_MIN;
}

async function callGemini(messages) {
  const url = process.env.GEMINI_API_URL;
  const key = process.env.GEMINI_API_KEY;
  if (!url || !key) throw new Error('Gemini not configured');
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    const err = new Error('Gemini error: ' + resp.status + ' ' + txt);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  return data.reply || data.output || (Array.isArray(data) ? data[0]?.content : null) || null;
}

async function callOpenAI(messages) {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) throw new Error('OpenAI not configured');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini', messages }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    const err = new Error('OpenAI error: ' + resp.status + ' ' + txt);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const choice = data.choices && data.choices[0];
  return (choice?.message?.content) || data?.output?.text || null;
}

function buildSystemPrompt() {
  const sys = `You are a gentle, patient voice-first assistant for elderly users. Keep replies short, clear, and kind. Prefer short sentences, avoid complex technical instructions, offer to repeat or simplify when asked, and provide gentle reminders and safety instructions when requested.`;
  return { role: 'system', content: sys };
}

// POST /api/chat { messages: [{role, content}], tts?: boolean }
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    if (!checkRateLimit(userId)) return res.status(429).json({ error: 'Rate limit exceeded' });

    const incoming = req.body?.messages || (req.body?.message ? [{ role: 'user', content: req.body.message }] : null);
    if (!incoming || !Array.isArray(incoming)) return res.status(400).json({ error: 'messages missing' });

    const messages = [buildSystemPrompt(), ...incoming];

    let replyText = null;
    // Choose provider preference via env LLM_PREFERRED. Allowed: 'openai' or 'gemini'. Default: 'openai'
    const preferred = (process.env.LLM_PREFERRED || 'openai').toLowerCase();

    async function tryProvidersInOrder(first, second) {
      try {
        return await first(messages);
      } catch (eFirst) {
        try {
          return await second(messages);
        } catch (eSecond) {
          console.error('LLM providers failed', eFirst, eSecond);
          // Graceful local fallback so the chat remains usable without provider access
          return "Hello — I'm here to help, but the AI service is currently unavailable. I can set reminders, play devotional content, or answer simple questions. Would you like me to set a reminder or play a devotional?";
        }
      }
    }

    if (preferred === 'gemini') {
      replyText = await tryProvidersInOrder(callGemini, callOpenAI);
    } else {
      // default: prefer OpenAI
      replyText = await tryProvidersInOrder(callOpenAI, callGemini);
    }

    if (!replyText) return res.status(502).json({ error: 'Empty reply from LLM' });

    const resp = { reply: replyText };

    if (req.body?.tts) {
      try {
        const speakResp = await fetch(`${req.protocol}://${req.get('host')}/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: replyText, voice: req.body.voice || process.env.MURF_VOICE_ID }),
        });
        if (speakResp.ok) {
          const sd = await speakResp.json();
          if (sd && sd.url) resp.audioUrl = sd.url;
        } else {
          const txt = await speakResp.text();
          console.warn('speak endpoint failed', speakResp.status, txt);
        }
      } catch (e) {
        console.warn('TTS generation error', e.message);
      }
    }

    return res.json(resp);
  } catch (err) {
    console.error('Chat route error', err);
    return res.status(500).json({ error: 'chat failed', details: err.message });
  }
});

module.exports = router;
