const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CACHE_FILE = path.join(CACHE_DIR, 'news_cache.json');

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf8');
    return true;
  } catch (e) {
    console.error('news cache write error', e);
    return false;
  }
}

function isFresh(cachedObj, ttlSeconds) {
  if (!cachedObj || !cachedObj.timestamp) return false;
  const age = (Date.now() - cachedObj.timestamp) / 1000;
  return age <= ttlSeconds;
}

module.exports = { readCache, writeCache, isFresh };
