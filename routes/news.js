const express = require('express');
const { authenticateToken } = require('../auth');
const RSSParser = require('rss-parser');

const router = express.Router();
const parser = new RSSParser();
const { readCache, writeCache, isFresh } = require('../newsCache');
const DEFAULT_TTL = parseInt(process.env.NEWS_CACHE_TTL || '600', 10); // seconds
const REFRESH_INTERVAL = parseInt(process.env.NEWS_REFRESH_INTERVAL || String(DEFAULT_TTL), 10); // seconds

// Simple server-side categorization keywords (keeps filtering consistent)
const healthKeywords = ['health', 'covid', 'vaccine', 'hospital', 'doctor', 'nursing', 'flu'];
const businessKeywords = ['market', 'stocks', 'econom', 'business', 'trade', 'inflation', 'bank'];
const sportsKeywords = ['match', 'score', 'league', 'tournament', 'goal', 'win', 'cricket', 'football', 'olympic'];
const weatherKeywords = ['weather', 'storm', 'rain', 'temperature', 'snow', 'forecast', 'heat'];

function detectCategory(title = '', snippet = '') {
  const text = (String(title || '') + ' ' + String(snippet || '')).toLowerCase();
  if (healthKeywords.some(k => text.includes(k))) return 'Health';
  if (businessKeywords.some(k => text.includes(k))) return 'Business';
  if (sportsKeywords.some(k => text.includes(k))) return 'Sports';
  if (weatherKeywords.some(k => text.includes(k))) return 'Weather';
  return 'Headlines';
}

// Static seed for news summaries. In production, integrate with a news API or RSS.
const NEWS_SEED = [
  { id: 1, title: 'Local Health Camp For Seniors', summary: 'A free health camp for seniors will be held at the community center on Saturday.' },
  { id: 2, title: 'Weather Update', summary: 'Expect light showers over the weekend with mild temperatures.' },
  { id: 3, title: 'Community Event', summary: 'A cultural program with devotional songs will be organized next week.' }
];

// Protected route (original)
router.get('/', authenticateToken, (_req, res) => {
  res.json({ news: NEWS_SEED });
});

// Public seed route for quick testing without auth
router.get('/public', (_req, res) => {
  res.json({ news: NEWS_SEED });
});

// Load feeds from config
let FEEDS_CONFIG = [];
try {
  FEEDS_CONFIG = require('../config/feeds.json').feeds || [];
} catch (e) {
  console.warn('feeds.json not found or invalid, falling back to built-in feeds');
}

// Sources endpoint
router.get('/sources', (_req, res) => {
  const list = (FEEDS_CONFIG.length ? FEEDS_CONFIG : [
    { name: 'CNN', url: 'https://rss.cnn.com/rss/edition.rss' },
    { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' }
  ]).map(f => ({ name: f.name, url: f.url }));
  res.json({ sources: list });
});

// Aggregated RSS feeds from popular sources (example list). This is public and unauthenticated.
router.get('/all', async (_req, res) => {
  try {
    const feeds = (FEEDS_CONFIG.length ? FEEDS_CONFIG.map(f => f.url) : [
      'https://rss.cnn.com/rss/edition.rss',
      'http://feeds.bbci.co.uk/news/rss.xml',
      'https://www.theguardian.com/world/rss',
      'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'
    ]);
    // Check cache
    const cached = readCache();
    if (isFresh(cached, DEFAULT_TTL)) {
      return res.json({ news: cached.items, lastUpdated: cached.timestamp, cached: true });
    }

    const items = [];
    for (const url of feeds) {
      try {
        const feed = await parser.parseURL(url);
        for (const it of (feed.items || []).slice(0, 6)) {
          const snippet = it.contentSnippet || it.content || '';
          items.push({ source: feed.title, title: it.title, link: it.link, pubDate: it.pubDate, contentSnippet: snippet, category: detectCategory(it.title, snippet) });
        }
      } catch (e) {
        console.warn('Failed to fetch feed', url, e.message);
      }
    }

    // dedupe & slice
    const seen = new Set();
    const deduped = items.filter(i => {
      if (!i.title) return false;
      if (seen.has(i.title)) return false;
      seen.add(i.title);
      return true;
    }).slice(0, 200);

    // Ensure each item has category and normalized keys
    const normalized = deduped.map((i) => ({
      source: i.source,
      title: i.title,
      link: i.link,
      pubDate: i.pubDate,
      contentSnippet: i.contentSnippet || '',
      category: i.category || detectCategory(i.title, i.contentSnippet || '')
    }));

    const payload = { items: normalized, timestamp: Date.now() };
    try { writeCache(payload); } catch (e) { /* ignore */ }

    res.json({ news: deduped, lastUpdated: payload.timestamp, cached: false });
  } catch (err) {
    console.error('RSS aggregation error', err);
    res.status(500).json({ error: 'Failed to fetch aggregated news' });
  }
});

// Background refresher with per-feed exponential backoff
const failureCounts = {}; // url -> failures
const nextAttemptAt = {}; // url -> timestamp ms
const BACKOFF_BASE = Math.max(60, DEFAULT_TTL); // seconds

async function safeFetchAndWrite() {
  try {
    console.log('[news] safe background refresh starting');
    const feeds = (FEEDS_CONFIG.length ? FEEDS_CONFIG.map(f => f.url) : []);
    if (!feeds.length) return;
    const items = [];
  for (const url of feeds) {
      const now = Date.now();
      if (nextAttemptAt[url] && now < nextAttemptAt[url]) {
        console.log('[news] skipping', url, 'next attempt at', new Date(nextAttemptAt[url]).toISOString());
        continue;
      }
      try {
        const feed = await parser.parseURL(url);
        for (const it of (feed.items || []).slice(0, 6)) {
          const snippet = it.contentSnippet || it.content || '';
          items.push({ source: feed.title, title: it.title, link: it.link, pubDate: it.pubDate, contentSnippet: snippet, category: detectCategory(it.title, snippet) });
        }
        // success -> clear failure record
        if (failureCounts[url]) { delete failureCounts[url]; }
        nextAttemptAt[url] = 0;
      } catch (e) {
        // increment failure count and apply exponential backoff
        failureCounts[url] = (failureCounts[url] || 0) + 1;
        const delay = Math.min(3600, BACKOFF_BASE * Math.pow(2, failureCounts[url] - 1)); // cap at 1 hour
        nextAttemptAt[url] = Date.now() + delay * 1000;
        console.warn('[news] background fetch failed for', url, e.message, '-> backoff (s)=', delay);
      }
    }

    const seen = new Set();
    const deduped = items.filter(i => i.title && !seen.has(i.title) && (seen.add(i.title) || true)).slice(0,200);
    const payload = { items: deduped, timestamp: Date.now() };
    try { writeCache(payload); } catch (e) { /* ignore */ }
    console.log('[news] safe background refresh completed, items=', deduped.length);
  } catch (e) {
    console.warn('[news] safe background refresh error', e.message);
  }
}

try {
  // initial run
  safeFetchAndWrite().catch(() => {});
  // interval run
  setInterval(() => { safeFetchAndWrite().catch(() => {}); }, Math.max(10, REFRESH_INTERVAL) * 1000);
} catch (e) {
  console.warn('[news] failed to start background refresher', e.message);
}

module.exports = router;
