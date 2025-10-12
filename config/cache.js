const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function makeKey(text, voiceId) {
  const hash = crypto.createHash('sha256');
  hash.update((voiceId || '') + '::' + (text || ''));
  return hash.digest('hex');
}

function getCachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function has(key) {
  return fs.existsSync(getCachePath(key));
}

function read(key) {
  try {
    const raw = fs.readFileSync(getCachePath(key), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function write(key, data) {
  try {
    fs.writeFileSync(getCachePath(key), JSON.stringify(data), 'utf8');
    return true;
  } catch (e) {
    console.error('Cache write error', e);
    return false;
  }
}

module.exports = { makeKey, has, read, write };
