// Simple WS client to test /ws-tts streaming
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:5000/ws-tts';
const TEXT = 'Hello from Saanidhya test over WebSocket';
const VOICE = process.env.MURF_VOICE_ID || 'en-IN-arohi';

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('[ws-test] connected');
  ws.send(JSON.stringify({ text: TEXT, voiceId: VOICE }));
});

let receivedChunks = 0;
ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'chunk') {
      receivedChunks += 1;
      process.stdout.write(`[ws-test] chunk ${receivedChunks} size=${msg.data.length}\r`);
    } else if (msg.type === 'done') {
      console.log(`\n[ws-test] done (format=${msg.format})`);
      ws.close();
    } else if (msg.type === 'url') {
      console.log('[ws-test] audio URL:', msg.url);
      ws.close();
    } else if (msg.error) {
      console.error('[ws-test] error from server:', msg.error, msg.details || '');
      ws.close();
    } else {
      console.log('[ws-test] message:', msg);
    }
  } catch (e) {
    console.log('[ws-test] raw message:', data.toString().slice(0,200));
  }
});

ws.on('close', () => {
  console.log('[ws-test] connection closed');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('[ws-test] socket error', err.message);
  process.exit(1);
});
