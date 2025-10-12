import { useEffect, useRef, useState } from 'react';
import ApiService from '../services/ApiService';

export default function VoiceMessages() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchList() {
    try {
      const res = await ApiService.get('/voices');
      setMessages((res as any).data || (res as any) || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => setChunks((c) => [...c, e.data]);
    mr.onstop = () => {
      // noop
    };
    mr.start();
    setMediaRecorder(mr);
    setChunks([]);
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
    setTimeout(() => uploadRecording(), 100); // slight delay to flush dataavailable
  }

  async function uploadRecording() {
    if (!chunks.length) return;
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    try {
      const res = await ApiService.postMultipart('/voices/upload', fd);
      console.log('uploaded', (res as any).data || res);
      await fetchList();
    } catch (e) {
      console.error(e);
    }
  }

  function playUrl(url: string) {
    if (!audioRef.current) audioRef.current = document.createElement('audio');
    audioRef.current.src = url;
    audioRef.current.play();
  }

  async function transcribeMessage(id: number) {
    try {
      // fetch file first as blob
      const resp = await ApiService.get(`/voices/${id}/file`, { responseType: 'blob' });
      const fd = new FormData();
      fd.append('audio', (resp as any).data as Blob, 'file');
      const t = await ApiService.postMultipart('/voices/stt', fd);
      // postMultipart returns parsed JSON by default
      const transcription = (t as any).transcription || (t as any).data?.transcription || (t as any);
      alert('Transcription: ' + (typeof transcription === 'string' ? transcription : JSON.stringify(transcription)));
    } catch (e) {
      console.error(e);
      console.warn('Server STT failed, attempting browser STT fallback');
      // Browser fallback: use Web Speech API (live listening)
      if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recog = new SpeechRecognition();
        recog.lang = 'en-IN';
        recog.interimResults = false;
        recog.maxAlternatives = 1;
        alert('Starting browser-based live transcription. Please play the audio or speak now.');
        recog.start();
        recog.onresult = (ev: any) => {
          const text = ev.results[0][0].transcript;
          alert('Browser transcription: ' + text);
          recog.stop();
        };
        recog.onerror = (err: any) => {
          console.error('Browser STT error', err);
          alert('Browser STT failed');
          recog.stop();
        };
      } else {
        alert('Transcription failed (server unavailable and browser STT not supported)');
      }
    }
  }

  async function deleteMessage(id: number) {
    if (!confirm('Delete this message?')) return;
    try {
      const token = localStorage.getItem('authToken');
      const headers: any = token ? { Authorization: `Bearer ${token}` } : undefined;
      const resp = await fetch(`http://localhost:5000/api/voices/${id}`, { method: 'DELETE', headers });
      if (!resp.ok) throw new Error('Delete failed');
      await fetchList();
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Voice Messages</h2>
      <div className="mb-4">
        {!recording ? (
          <button className="btn" onClick={startRecording}>Start Recording</button>
        ) : (
          <button className="btn btn-red" onClick={stopRecording}>Stop</button>
        )}
      </div>

      <div>
        <h3 className="font-semibold">Messages</h3>
        <ul>
          {messages.map((m: any) => (
            <li key={m.id} className="mb-2">
              <div>{m.original_name || m.filename} — {new Date(m.created_at).toLocaleString()}</div>
              <div className="flex gap-2 mt-1">
                <button className="btn" onClick={() => playUrl(m.url)}>Play</button>
                <button className="btn" onClick={() => transcribeMessage(m.id)}>Transcribe</button>
                <button className="btn btn-red" onClick={() => deleteMessage(m.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
