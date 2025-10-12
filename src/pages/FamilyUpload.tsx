import { useState } from 'react';
import ApiService from '../services/ApiService';

export default function FamilyUpload() {
  const [token, setToken] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!token || !file) return alert('Please enter token and choose a file');
    const fd = new FormData();
    fd.append('audio', file, file.name);
    try {
      const res = await fetch(`http://localhost:5000/api/family/upload/${token}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) return alert('Upload failed: ' + JSON.stringify(data));
      setMessage('Uploaded successfully');
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Send a voice greeting</h1>
      <div className="mb-3">
        <label className="block text-sm font-medium">Elder token</label>
        <input className="mt-1 p-2 border w-full" value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste the elder's token" />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">Audio file</label>
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={submit}>Upload</button>
      </div>
      {message && <div className="mt-3 text-green-600">{message}</div>}
    </div>
  );
}
