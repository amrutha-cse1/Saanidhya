import React, { useState } from 'react';
import { MurfService } from '../services/MurfService';
import { useLanguage } from '../contexts/LanguageContext';

const Chat: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [playReply, setPlayReply] = useState(true);
  const { currentLanguage } = useLanguage();

  const send = async () => {
    if (!input.trim()) return;
    const newMsg = { role: 'user', content: input };
    const messages = [...history, newMsg];
    setHistory(messages);
    setInput('');

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages, tts: playReply })
      });
      const data = await res.json();
      const reply = data?.reply || 'Sorry, no reply.';
      const replyMsg = { role: 'assistant', content: reply };
      setHistory(prev => [...prev, replyMsg]);
      // If server returned an audioUrl use it, otherwise use MurfService fallback when playReply enabled
      if (data?.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play().catch(err => console.error('Audio play failed', err));
      } else if (playReply) {
        await MurfService.playText(reply, currentLanguage.code);
      }
    } catch (err) {
      console.error('Chat error', err);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
  <h1 className="text-2xl font-semibold mb-4">Saanidhya Chat</h1>
      <div className="space-y-3 mb-4">
        {history.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-50 text-right' : 'bg-gray-100'}`}>
            <div className="text-sm">{m.content}</div>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <input className="flex-1 p-3 border rounded" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="px-4 py-3 bg-blue-600 text-white rounded" onClick={send}>Send</button>
      </div>
      <div className="mt-3 flex items-center space-x-2">
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={playReply} onChange={e => setPlayReply(e.target.checked)} />
          <span className="text-sm">Play reply as audio</span>
        </label>
      </div>
    </div>
  );
};

export default Chat;
