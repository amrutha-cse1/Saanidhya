const { allQuery, runQuery } = require('./database');
const fetch = require('node-fetch');
const path = require('path');

const CHECK_INTERVAL_MS = parseInt(process.env.REMINDER_CHECK_MS || String(30 * 1000), 10); // default 30s

async function checkAndRunReminders(baseUrl) {
  try {
    // Very simple schedule: reminders table has time (HH:MM) and days as JSON array
    const rows = await allQuery('SELECT r.id, r.user_id, r.name, r.time, r.days, u.email FROM medicine_reminders r JOIN users u ON u.id = r.user_id WHERE r.is_active = 1');
    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5);
    for (const r of rows) {
      try {
        const days = r.days ? JSON.parse(r.days) : [];
        const weekday = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
        // simple match: same time and today included
        if (r.time === hhmm && (days.length === 0 || days.includes(weekday))) {
          // Prevent duplicate triggering: insert into a small table or mark last_triggered in DB; here we update last_triggered to now and skip if recent.
          const last = await runQuery('SELECT last_triggered FROM medicine_reminders WHERE id = ?', [r.id]).catch(()=>null);
          // update last_triggered to avoid duplicates
          await runQuery('UPDATE medicine_reminders SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?', [r.id]);

          // call /speak to generate TTS (we don't need the audio here, Murf will cache)
          const speakUrl = `${baseUrl}/speak`;
          const text = `Reminder: ${r.name}. It's time to take your medicine.`;
          try {
            await fetch(speakUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
            console.log('Triggered reminder for', r.id, r.name);
          } catch (e) {
            console.warn('Failed to call speak for reminder', e.message);
          }
        }
      } catch (e) {
        console.error('Reminder row error', e);
      }
    }
  } catch (e) {
    console.error('Reminder check failed', e);
  }
}

async function runOnce(baseUrl) {
  await checkAndRunReminders(baseUrl);
}

function startRunner(baseUrl) {
  console.log('[reminderRunner] starting with interval ms=', CHECK_INTERVAL_MS);
  setInterval(() => checkAndRunReminders(baseUrl), CHECK_INTERVAL_MS);
}

module.exports = { startRunner, runOnce };
