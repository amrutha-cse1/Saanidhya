const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Twilio client (optional)
let twilioClient = null;
try {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
} catch (e) {
  console.warn('Twilio client not initialized', e.message);
}

// Get all emergency contacts for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contacts = await allQuery(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
      [req.user.id]
    );

    const formattedContacts = contacts.map(contact => ({
      ...contact,
      is_primary: Boolean(contact.is_primary)
    }));

    res.json({ contacts: formattedContacts });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new emergency contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, relationship, is_primary } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({ 
        error: 'Name, phone, and relationship are required' 
      });
    }

    // If this is set as primary, remove primary status from other contacts
    if (is_primary) {
      await runQuery(
        'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?',
        [req.user.id]
      );
    }

    const result = await runQuery(
      'INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, phone, relationship, is_primary || false]
    );

    const newContact = await getQuery(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Emergency contact added successfully',
      contact: {
        ...newContact,
        is_primary: Boolean(newContact.is_primary)
      }
    });
  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an emergency contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship, is_primary } = req.body;

    // Check if contact belongs to user
    const contact = await getQuery(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    // If this is set as primary, remove primary status from other contacts
    if (is_primary && !contact.is_primary) {
      await runQuery(
        'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ? AND id != ?',
        [req.user.id, id]
      );
    }

    await runQuery(
      `UPDATE emergency_contacts 
       SET name = ?, phone = ?, relationship = ?, is_primary = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [
        name || contact.name,
        phone || contact.phone,
        relationship || contact.relationship,
        is_primary !== undefined ? is_primary : contact.is_primary,
        id,
        req.user.id
      ]
    );

    const updatedContact = await getQuery(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Emergency contact updated successfully',
      contact: {
        ...updatedContact,
        is_primary: Boolean(updatedContact.is_primary)
      }
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an emergency contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runQuery(
      'DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    res.json({ message: 'Emergency contact deleted successfully' });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set primary contact
router.patch('/:id/primary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if contact belongs to user
    const contact = await getQuery(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    // Remove primary status from all contacts
    await runQuery(
      'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?',
      [req.user.id]
    );

    // Set this contact as primary
    await runQuery(
      'UPDATE emergency_contacts SET is_primary = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({ 
      message: 'Primary contact updated successfully'
    });
  } catch (error) {
    console.error('Set primary contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get primary contact
router.get('/primary', authenticateToken, async (req, res) => {
  try {
    const primaryContact = await getQuery(
      'SELECT * FROM emergency_contacts WHERE user_id = ? AND is_primary = 1',
      [req.user.id]
    );

    if (!primaryContact) {
      return res.status(404).json({ error: 'No primary contact found' });
    }

    res.json({ 
      contact: {
        ...primaryContact,
        is_primary: Boolean(primaryContact.is_primary)
      }
    });
  } catch (error) {
    console.error('Get primary contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulate a call or SMS event to a contact (does not perform real calls)
router.post('/simulate-call', authenticateToken, async (req, res) => {
  try {
    const { contactId, name } = req.body || {};
    const timestamp = new Date().toISOString();

    // Optionally check contact exists
    let contact = null;
    if (contactId) {
      contact = await getQuery('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?', [contactId, req.user.id]);
    }

    // Log to console for now; could be stored in DB table for history
    console.log(`[SIMULATED CALL] user=${req.user.id} contactId=${contactId} name=${name || (contact && contact.name)} at ${timestamp}`);

    return res.json({ message: 'Simulated call logged', timestamp, contact: contact || { name: name || null } });
  } catch (error) {
    console.error('Simulate call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real call endpoint (uses Twilio if configured; otherwise fallback to simulate)
router.post('/call', authenticateToken, async (req, res) => {
  try {
    const { contactId, name } = req.body || {};
    let contact = null;
    if (contactId) contact = await getQuery('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?', [contactId, req.user.id]);

    if (!contact && !name) return res.status(400).json({ error: 'contactId or name is required' });

    // If Twilio configured, place a call
    if (twilioClient && process.env.TWILIO_FROM) {
      const to = contact ? contact.phone : (req.body.phone || null);
      if (!to) return res.status(400).json({ error: 'phone number not available for contact' });

      // Make a simple call that says a message (TwiML Bin would be used in prod)
      const call = await twilioClient.calls.create({
        to,
        from: process.env.TWILIO_FROM,
  twiml: `<Response><Say voice="alice">This is a call from Saanidhya on behalf of your contact. Please check if they need assistance.</Say></Response>`
      });

      console.log('[TWILIO] Call initiated', call.sid);
      return res.json({ message: 'Call initiated', sid: call.sid });
    }

    // Fallback: simulate
    const timestamp = new Date().toISOString();
    console.log(`[SIMULATED CALL] user=${req.user.id} contactId=${contactId} name=${name || (contact && contact.name)} at ${timestamp}`);
    return res.json({ message: 'Simulated call logged', timestamp, contact: contact || { name: name || null } });
  } catch (error) {
    console.error('Call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real SMS endpoint (uses Twilio if configured; otherwise fallback to simulate)
router.post('/sms', authenticateToken, async (req, res) => {
  try {
    const { contactId, message, phone } = req.body || {};
    let contact = null;
    if (contactId) contact = await getQuery('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?', [contactId, req.user.id]);

    const to = contact ? contact.phone : (phone || null);
    if (!to) return res.status(400).json({ error: 'phone number not available' });

    if (twilioClient && process.env.TWILIO_FROM) {
  const sms = await twilioClient.messages.create({ body: message || 'This is an emergency message from Saanidhya.', from: process.env.TWILIO_FROM, to });
      console.log('[TWILIO] SMS sent', sms.sid);
      return res.json({ message: 'SMS sent', sid: sms.sid });
    }

    // Fallback: simulate
    const timestamp = new Date().toISOString();
    console.log(`[SIMULATED SMS] user=${req.user.id} to=${to} message=${message} at ${timestamp}`);
    return res.json({ message: 'Simulated SMS logged', timestamp, to });
  } catch (error) {
    console.error('SMS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
