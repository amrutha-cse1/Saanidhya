import { useEffect, useState } from 'react';
import ApiService from '../services/ApiService';

export default function FamilyTokens() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [label, setLabel] = useState('');
  const [expires, setExpires] = useState('24');

  useEffect(() => { fetchTokens(); }, []);

  async function fetchTokens() {
    try {
      const res = await fetch('http://localhost:5000/api/family/tokens', { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } });
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (e) { console.error(e); }
  }

  async function createToken() {
    try {
      const res = await fetch('http://localhost:5000/api/family/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ label, expiresInHours: parseInt(expires, 10) })
      });
      const data = await res.json();
      if (!res.ok) return alert('Create failed: ' + JSON.stringify(data));
      alert('Token created: ' + data.token);
      fetchTokens();
    } catch (e) { console.error(e); alert('Create failed'); }
  }

  async function revoke(id: number) {
    if (!confirm('Revoke this token?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/family/token/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } });
      const data = await res.json();
      if (!res.ok) return alert('Revoke failed');
      fetchTokens();
    } catch (e) { console.error(e); alert('Revoke failed'); }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Family upload tokens</h1>
      <div className="mb-4">
        <input className="p-2 border mr-2" placeholder="label (e.g., Son - May 2025)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="p-2 border mr-2 w-24" value={expires} onChange={(e) => setExpires(e.target.value)} />
        <button className="btn" onClick={createToken}>Create token</button>
      </div>
      <div>
        <h3 className="font-semibold">Active tokens</h3>
        <ul>
          {tokens.map(t => (
            <li key={t.id} className="mb-2">
              <div>{t.label || '—'} — created: {new Date(t.created_at).toLocaleString()} {t.expires_at ? ` — expires: ${new Date(t.expires_at).toLocaleString()}` : ''}</div>
              <div className="flex gap-2 mt-2">
                <button className="btn" onClick={() => navigator.clipboard.writeText(t.token)}>Copy token</button>
                <button className="btn btn-red" onClick={() => revoke(t.id)}>Revoke</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
