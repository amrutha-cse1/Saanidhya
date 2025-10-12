const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Get all mood entries for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const moodEntries = await allQuery(
      'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    // Parse the interests JSON for each entry
    const formattedEntries = moodEntries.map(entry => ({
      ...entry,
      interests: entry.interests ? JSON.parse(entry.interests) : []
    }));

    res.json({ moodEntries: formattedEntries });
  } catch (error) {
    console.error('Get mood entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new mood entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { mood, activity_type, activity_content, interests, notes } = req.body;

    if (!mood) {
      return res.status(400).json({ error: 'Mood is required' });
    }

    const result = await runQuery(
      `INSERT INTO mood_entries (user_id, mood, activity_type, activity_content, interests, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        mood,
        activity_type || null,
        activity_content || null,
        interests ? JSON.stringify(interests) : null,
        notes || null
      ]
    );

    const newEntry = await getQuery(
      'SELECT * FROM mood_entries WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Mood entry added successfully',
      moodEntry: {
        ...newEntry,
        interests: newEntry.interests ? JSON.parse(newEntry.interests) : []
      }
    });
  } catch (error) {
    console.error('Add mood entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mood statistics for a user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '7' } = req.query; // Default to 7 days

    const stats = await allQuery(
      `SELECT mood, COUNT(*) as count 
       FROM mood_entries 
       WHERE user_id = ? AND created_at >= datetime('now', '-${period} days')
       GROUP BY mood
       ORDER BY count DESC`,
      [req.user.id]
    );

    const totalEntries = stats.reduce((sum, stat) => sum + stat.count, 0);

    const formattedStats = stats.map(stat => ({
      mood: stat.mood,
      count: stat.count,
      percentage: totalEntries > 0 ? Math.round((stat.count / totalEntries) * 100) : 0
    }));

    res.json({ 
      stats: formattedStats, 
      totalEntries,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Get mood stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get most common interests for a user
router.get('/interests', authenticateToken, async (req, res) => {
  try {
    const entries = await allQuery(
      'SELECT interests FROM mood_entries WHERE user_id = ? AND interests IS NOT NULL',
      [req.user.id]
    );

    const interestCount = {};
    
    entries.forEach(entry => {
      if (entry.interests) {
        const interests = JSON.parse(entry.interests);
        interests.forEach(interest => {
          interestCount[interest] = (interestCount[interest] || 0) + 1;
        });
      }
    });

    const sortedInterests = Object.entries(interestCount)
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 interests

    res.json({ interests: sortedInterests });
  } catch (error) {
    console.error('Get interests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a mood entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runQuery(
      'DELETE FROM mood_entries WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mood entry not found' });
    }

    res.json({ message: 'Mood entry deleted successfully' });
  } catch (error) {
    console.error('Delete mood entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
