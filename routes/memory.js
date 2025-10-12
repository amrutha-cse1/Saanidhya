const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Get all memory aids for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const memoryAids = await allQuery(
      'SELECT * FROM memory_aids WHERE user_id = ? ORDER BY date ASC, created_at DESC',
      [req.user.id]
    );

    const formattedMemoryAids = memoryAids.map(aid => ({
      ...aid,
      is_active: Boolean(aid.is_active)
    }));

    res.json({ memoryAids: formattedMemoryAids });
  } catch (error) {
    console.error('Get memory aids error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new memory aid
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, date, time, type, notes } = req.body;

    if (!title || !date || !type) {
      return res.status(400).json({ 
        error: 'Title, date, and type are required' 
      });
    }

    const validTypes = ['birthday', 'anniversary', 'spiritual', 'other', 'reminder'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be one of: birthday, anniversary, spiritual, other' 
      });
    }

    // Basic date validation (allow ISO date strings)
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD or ISO format.' });
    }

    const result = await runQuery(
      'INSERT INTO memory_aids (user_id, title, date, time, type, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, date, time || null, type, notes || null]
    );

    const newMemoryAid = await getQuery(
      'SELECT * FROM memory_aids WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Memory aid added successfully',
      memoryAid: {
        ...newMemoryAid,
        is_active: Boolean(newMemoryAid.is_active)
      }
    });
  } catch (error) {
    console.error('Add memory aid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a memory aid
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, type, notes, is_active } = req.body;

    // Check if memory aid belongs to user
    const memoryAid = await getQuery(
      'SELECT * FROM memory_aids WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!memoryAid) {
      return res.status(404).json({ error: 'Memory aid not found' });
    }

    await runQuery(
      `UPDATE memory_aids 
       SET title = ?, date = ?, type = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [
        title || memoryAid.title,
        date || memoryAid.date,
        type || memoryAid.type,
        notes !== undefined ? notes : memoryAid.notes,
        is_active !== undefined ? is_active : memoryAid.is_active,
        id,
        req.user.id
      ]
    );

    const updatedMemoryAid = await getQuery(
      'SELECT * FROM memory_aids WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Memory aid updated successfully',
      memoryAid: {
        ...updatedMemoryAid,
        is_active: Boolean(updatedMemoryAid.is_active)
      }
    });
  } catch (error) {
    console.error('Update memory aid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a memory aid
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runQuery(
      'DELETE FROM memory_aids WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Memory aid not found' });
    }

    res.json({ message: 'Memory aid deleted successfully' });
  } catch (error) {
    console.error('Delete memory aid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's reminders
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const todaysReminders = await allQuery(
      'SELECT * FROM memory_aids WHERE user_id = ? AND date = ? AND is_active = 1 ORDER BY created_at DESC',
      [req.user.id, today]
    );

    const formattedReminders = todaysReminders.map(reminder => ({
      ...reminder,
      is_active: Boolean(reminder.is_active)
    }));

    res.json({ todaysReminders: formattedReminders });
  } catch (error) {
    console.error('Get today\'s reminders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming reminders (next 7 days)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const upcomingReminders = await allQuery(
      `SELECT * FROM memory_aids 
       WHERE user_id = ? AND date BETWEEN ? AND ? AND is_active = 1 
       ORDER BY date ASC, created_at DESC`,
      [req.user.id, today, nextWeek]
    );

    const formattedReminders = upcomingReminders.map(reminder => ({
      ...reminder,
      is_active: Boolean(reminder.is_active)
    }));

    res.json({ upcomingReminders: formattedReminders });
  } catch (error) {
    console.error('Get upcoming reminders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
