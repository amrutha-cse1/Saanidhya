const express = require('express');
const { authenticateToken } = require('../auth');

const router = express.Router();

const DEVOTIONAL_SEED = [
  { id: 1, title: 'Morning Aarti', content: 'Om Jai Jagdish Hare, Swami Om Jai Jagdish Hare...' },
  { id: 2, title: 'Short Bhajan', content: 'Raghupati Raghav Raja Ram, Patit Pavan Sita Ram...' },
  { id: 3, title: 'Daily Quote', content: 'Start your day with gratitude and a moment of silence.' }
];

router.get('/', authenticateToken, (_req, res) => {
  res.json({ devotionals: DEVOTIONAL_SEED });
});

module.exports = router;
