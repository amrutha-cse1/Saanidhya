const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// GET /api/weather - returns simple weather summary; uses OPENWEATHER_API_KEY and WEATHER_CITY if provided
router.get('/', async (req, res) => {
  const key = process.env.OPENWEATHER_API_KEY;
  const city = process.env.WEATHER_CITY || 'Mumbai';
  if (!key) {
    return res.json({ city, summary: `Weather info not configured on server. Try: It's a pleasant day.` });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'weather provider error', details: txt });
    }
    const data = await resp.json();
    const summary = `${data.weather?.[0]?.description || 'Clear'}; ${Math.round(data.main?.temp)}°C`;
    return res.json({ city, summary, raw: data });
  } catch (e) {
    console.error('Weather fetch failed', e);
    return res.status(500).json({ error: 'weather failed', details: e.message });
  }
});

module.exports = router;
