import React from 'react';
import { useVoice } from '../contexts/VoiceContext';
import { MurfService } from '../services/MurfService';

const DEFAULT_VOICES = [
  { id: 'en-IN-arohi', label: 'English (India) - Arohi' },
  { id: 'mr-IN-1', label: 'Marathi - (placeholder)' },
  { id: 'te-IN-1', label: 'Telugu - (placeholder)' },
  { id: 'kn-IN-1', label: 'Kannada - (placeholder)' },
  { id: 'gu-IN-1', label: 'Gujarati - (placeholder)' },
];

const VoiceSettings: React.FC = () => {
  const { voiceId, setVoiceId } = useVoice();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoiceId(e.target.value || null);
  };

  const testVoice = () => {
    const text = 'Hello, this is a test of your selected voice.';
    MurfService.playText(text, voiceId || undefined);
  };

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <h4 className="text-sm font-semibold mb-2">Playback Voice</h4>
      <select value={voiceId || ''} onChange={handleChange} className="w-full p-2 border rounded mb-3">
        <option value="">(Default Murf voice)</option>
        {DEFAULT_VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button onClick={testVoice} className="px-3 py-2 bg-blue-500 text-white rounded">Test Voice</button>
      </div>
    </div>
  );
};

export default VoiceSettings;
