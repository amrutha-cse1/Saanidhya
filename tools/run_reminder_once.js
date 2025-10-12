// Run a single reminder check (test helper)
// Usage: node run_reminder_once.js <userId> "Reminder name" "HH:MM"

const { runQuery } = require('../murf-backend/database');
const fetch = require('node-fetch');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node run_reminder_once.js <userId> "Reminder name" "HH:MM"');
    process.exit(1);
  }
  const [userId, name, time] = args;
  const days = JSON.stringify([]);
  // Insert reminder
  const res = await runQuery('INSERT INTO medicine_reminders (user_id, name, time, days, is_active) VALUES (?, ?, ?, ?, 1)', [userId, name, time, days]);
  console.log('Inserted reminder id', res.id);

  // Call the reminder runner directly via require
  const { runOnce } = require('../murf-backend/reminderRunner');
  const baseUrl = 'http://localhost:5000';
  await runOnce(baseUrl);
  console.log('runOnce complete');
}

main().catch(e => { console.error(e); process.exit(1); });
