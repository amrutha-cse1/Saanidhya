const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Get all medicine reminders for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const medicines = await allQuery(
      'SELECT * FROM medicine_reminders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Parse the days JSON for each medicine
    const formattedMedicines = medicines.map(medicine => ({
      ...medicine,
      days: JSON.parse(medicine.days),
      is_active: Boolean(medicine.is_active)
    }));

    res.json({ medicines: formattedMedicines });
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new medicine reminder
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, time, days } = req.body;

    if (!name || !time || !days || !Array.isArray(days)) {
      return res.status(400).json({ 
        error: 'Name, time, and days array are required' 
      });
    }

    const result = await runQuery(
      'INSERT INTO medicine_reminders (user_id, name, time, days) VALUES (?, ?, ?, ?)',
      [req.user.id, name, time, JSON.stringify(days)]
    );

    const newMedicine = await getQuery(
      'SELECT * FROM medicine_reminders WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Medicine reminder added successfully',
      medicine: {
        ...newMedicine,
        days: JSON.parse(newMedicine.days),
        is_active: Boolean(newMedicine.is_active)
      }
    });
  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a medicine reminder
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, time, days, is_active } = req.body;

    // Check if medicine belongs to user
    const medicine = await getQuery(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine reminder not found' });
    }

    await runQuery(
      `UPDATE medicine_reminders 
       SET name = ?, time = ?, days = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [
        name || medicine.name,
        time || medicine.time,
        days ? JSON.stringify(days) : medicine.days,
        is_active !== undefined ? is_active : medicine.is_active,
        id,
        req.user.id
      ]
    );

    const updatedMedicine = await getQuery(
      'SELECT * FROM medicine_reminders WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Medicine reminder updated successfully',
      medicine: {
        ...updatedMedicine,
        days: JSON.parse(updatedMedicine.days),
        is_active: Boolean(updatedMedicine.is_active)
      }
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a medicine reminder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runQuery(
      'DELETE FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Medicine reminder not found' });
    }

    res.json({ message: 'Medicine reminder deleted successfully' });
  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle medicine reminder active status
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const medicine = await getQuery(
      'SELECT is_active FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine reminder not found' });
    }

    const newStatus = !medicine.is_active;

    await runQuery(
      'UPDATE medicine_reminders SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [newStatus, id, req.user.id]
    );

    res.json({ 
      message: 'Medicine reminder status updated successfully',
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle medicine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
