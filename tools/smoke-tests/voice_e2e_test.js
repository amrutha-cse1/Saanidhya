// Voice message E2E smoke test for Saanidhya
// Usage: node voice_e2e_test.js

const fs = require('fs');
const path = require('path');
const API = 'http://localhost:5000/api';

async function main() {
  const ts = Date.now();
  const email = `voice${ts}@test.local`;
  const password = 'Test1234';
  let token;
  let userId;
  let voiceId;

  // 1. Signup
  console.log('Signup...');
  let res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Voice Test' })
  });
  let data = await res.json();
  if (!res.ok && data.error && data.error.includes('exists')) {
    // Try signin
    console.log('User exists, signing in...');
    res = await fetch(`${API}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    data = await res.json();
  }
  if (!data.token) throw new Error('Signup/signin failed: ' + JSON.stringify(data));
  token = data.token;
  userId = data.user?.id;
  console.log('Signed in as', email, 'userId:', userId);

  // 2. Upload a tiny WAV file
  console.log('Uploading voice message...');
  // Generate a 1-second silent WAV file
  const wavPath = path.join(__dirname, 'test.wav');
  if (!fs.existsSync(wavPath)) {
    const wavHeader = Buffer.from([
      82,73,70,70,36,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,68,172,0,0,2,0,16,0,100,97,116,97,0,0,0,0
    ]); // Minimal header
    const wavData = Buffer.alloc(32000, 0); // 1s silence at 16kHz
    fs.writeFileSync(wavPath, Buffer.concat([wavHeader, wavData]));
  }
  // Use node-fetch v2 in this folder which handles form-data nicely
  const nodeFetch = require('node-fetch');
  const FormDataNode = require('form-data');
  const fdNode = new FormDataNode();
  fdNode.append('audio', fs.createReadStream(wavPath), { filename: 'test.wav' });
  res = await nodeFetch(`${API}/voices/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...fdNode.getHeaders() },
    body: fdNode
  });
  data = await res.json();
  if (!res.ok || !data.id) throw new Error('Upload failed: ' + JSON.stringify(data));
  voiceId = data.id;
  console.log('Uploaded voice message id:', voiceId);

  // 3. List messages
  console.log('Listing voice messages...');
  res = await fetch(`${API}/voices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  data = await res.json();
  if (!Array.isArray(data)) throw new Error('List failed: ' + JSON.stringify(data));
  console.log('Voice messages:', data.map(m => ({ id: m.id, name: m.original_name, url: m.url })));

  // 4. Fetch file
  console.log('Fetching uploaded file...');
  const fileUrl = data.find(m => m.id === voiceId)?.url;
  if (!fileUrl) throw new Error('Uploaded file not found in list');
  res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('File fetch failed');
  const arr = await res.arrayBuffer();
  const fileBuf = Buffer.from(arr);
  console.log('Fetched file, size:', fileBuf.length);

  // 5. STT (if available)
  console.log('Transcribing (STT)...');
  const sttFdNode2 = new FormDataNode();
  sttFdNode2.append('audio', fs.createReadStream(wavPath), { filename: 'test.wav' });
  res = await nodeFetch(`${API}/voices/stt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...sttFdNode2.getHeaders() },
    body: sttFdNode2
  });
  data = await res.json();
  if (res.status === 501) {
    console.log('STT not available (OPENAI_API_KEY not set)');
  } else if (!res.ok) {
    console.log('STT failed:', data);
  } else {
    console.log('STT result:', data.transcription || data);
  }

  // 6. Delete message
  console.log('Deleting voice message...');
  res = await fetch(`${API}/voices/${voiceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  data = await res.json();
  if (!res.ok || !data.success) throw new Error('Delete failed: ' + JSON.stringify(data));
  console.log('Deleted voice message id:', voiceId);
  // --- Family token public-upload flow ---
  console.log('\nFamily token flow: creating token...');
  const createTokenRes = await nodeFetch(`${API}/family/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ label: 'smoke-test-public', expiresInHours: 2 })
  });
  const createTokenData = await createTokenRes.json();
  if (!createTokenRes.ok || !createTokenData.token) throw new Error('Create token failed: ' + JSON.stringify(createTokenData));
  const publicToken = createTokenData.token;
  console.log('Created public token:', publicToken);

  console.log('Uploading publicly with token...');
  const publicFd = new FormDataNode();
  publicFd.append('audio', fs.createReadStream(wavPath), { filename: 'public_test.wav' });
  const pubRes = await nodeFetch(`${API}/family/upload/${publicToken}`, {
    method: 'POST',
    headers: { ...publicFd.getHeaders() },
    body: publicFd
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok || !pubData.id) throw new Error('Public upload failed: ' + JSON.stringify(pubData));
  const publicVoiceId = pubData.id;
  console.log('Public upload succeeded, voice id:', publicVoiceId);

  console.log('Listing voice messages for elder to verify public upload...');
  const listAfter = await nodeFetch(`${API}/voices`, { headers: { Authorization: `Bearer ${token}` } });
  const listAfterData = await listAfter.json();
  if (!Array.isArray(listAfterData)) throw new Error('List after public upload failed: ' + JSON.stringify(listAfterData));
  const found = listAfterData.find(m => m.id === publicVoiceId);
  if (!found) throw new Error('Public-uploaded voice not found in elder listing');
  console.log('Verified public-uploaded voice is visible to elder:', { id: found.id, name: found.original_name });

  // Cleanup: delete the public-uploaded voice
  console.log('Deleting public-uploaded voice...');
  const delPub = await nodeFetch(`${API}/voices/${publicVoiceId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const delPubData = await delPub.json();
  if (!delPub.ok || !delPubData.success) throw new Error('Failed to delete public-uploaded voice: ' + JSON.stringify(delPubData));
  console.log('Deleted public-uploaded voice id:', publicVoiceId);

  console.log('Voice E2E smoke test complete.');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
