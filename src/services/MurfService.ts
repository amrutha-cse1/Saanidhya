const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export class MurfService {
  // Fallback using Web Speech API
  private static async useFallbackTTS(text: string) {
    return new Promise<void>((resolve, reject) => {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Try to find an Indian English voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang.includes('en-IN') || 
          voice.name.toLowerCase().includes('indian') ||
          voice.lang.includes('en-US')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.onend = () => {
          console.log('✅ Fallback TTS completed');
          // clear current utterance
          MurfService.currentUtterance = null;
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.error('❌ Fallback TTS error:', error);
          reject(error);
        };
        
        console.log('🔊 Using Web Speech API fallback');
        MurfService.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        reject(new Error('Speech synthesis not supported'));
      }
    });
  }

  // playback state used to enable stop()
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentWs: WebSocket | null = null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static currentResolve: (() => void) | null = null;
  private static currentReject: ((err?: any) => void) | null = null;

  // Stop any ongoing playback (audio, websocket, or speechSynthesis)
  static async stop() {
    try {
      if (MurfService.currentWs) {
        try { MurfService.currentWs.close(); } catch (e) {}
        MurfService.currentWs = null;
      }
      if (MurfService.currentAudio) {
        try { MurfService.currentAudio.pause(); } catch (e) {}
        try { MurfService.currentAudio.src = ''; } catch (e) {}
        MurfService.currentAudio = null;
      }
      if (MurfService.currentUtterance) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        MurfService.currentUtterance = null;
      }
      if (MurfService.currentResolve) {
        MurfService.currentResolve();
      }
      MurfService.currentResolve = null;
      MurfService.currentReject = null;
    } catch (e) {
      console.warn('MurfService.stop error', e);
    }
  }

  // Try WebSocket-based streaming TTS first (fast/low-latency). Falls back to REST /speak, then Web Speech API.
  static async playText(text: string, voiceId?: string) {
    // ensure any previous playback is stopped first
    await this.stop();
    // Helper: final fallback
    const finalFallback = async () => {
      try {
        await this.useFallbackTTS(text);
      } catch (fallbackError) {
        console.error('❌ All TTS methods failed:', fallbackError);
        alert(`🗣️ Voice Message: "${text}"`);
      }
    };

    // Try WebSocket streaming if available
    try {
      const wsUrl = BASE_URL.replace(/^http/, 'ws') + '/ws-tts';
      console.log('[frontend] Attempting WebSocket TTS at', wsUrl);

      const ws = new WebSocket(wsUrl);
      MurfService.currentWs = ws;

      const chunks: string[] = [];

      const wsPromise: Promise<void> = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket TTS timeout'));
          try { ws.close(); } catch (e) {}
        }, 8000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ text, voiceId }));
        };

        ws.onmessage = (ev) => {
          try {
            const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;

            if (msg.error) {
              clearTimeout(timeout);
              reject(new Error(msg.error));
              try { ws.close(); } catch (e) {}
              return;
            }

            if (msg.type === 'done') {
              clearTimeout(timeout);
              resolve();
              try { ws.close(); } catch (e) {}
              return;
            }

            if (msg.type === 'url' && msg.url) {
              // server provided an audio URL to play
              clearTimeout(timeout);
              try {
                const audio = new Audio(msg.url);
                MurfService.currentAudio = audio;
                audio.onended = () => { MurfService.currentAudio = null; resolve(); };
                audio.onerror = () => { MurfService.currentAudio = null; reject(new Error('Audio play failed')); };
                audio.play().catch((err) => { MurfService.currentAudio = null; reject(err); });
              } catch (e) {
                reject(e);
              } finally {
                try { ws.close(); } catch (e) {}
              }
              return;
            }

            // support chunked base64 parts if server streams them
            if (msg.type === 'chunk' && msg.data) {
              chunks.push(msg.data);
            }

          } catch (err) {
            clearTimeout(timeout);
            reject(err);
            try { ws.close(); } catch (e) {}
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };

        ws.onclose = () => {
          // no-op; resolution happens on 'done' or url
        };
      });

      await wsPromise;

      // clear websocket ref
      MurfService.currentWs = null;

      if (chunks.length > 0) {
        // Assemble base64 and play
        const base64 = chunks.join('');
        const binary = atob(base64);
        const len = binary.length;
        const buffer = new Uint8Array(len);
        for (let i = 0; i < len; i++) buffer[i] = binary.charCodeAt(i);
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        MurfService.currentAudio = audio;
        const playPromise = new Promise<void>((resolve, reject) => {
          audio.onended = () => { MurfService.currentAudio = null; resolve(); };
          audio.onerror = (e) => { MurfService.currentAudio = null; reject(new Error('Audio playback failed')); };
        });
        audio.play().catch((e) => { MurfService.currentAudio = null; throw e; });
        await playPromise;
        URL.revokeObjectURL(url);
        console.log('✅ WebSocket Murf TTS completed');
        return;
      }

    } catch (wsError) {
      console.warn('⚠️ WebSocket TTS failed:', wsError);
      // Fall through to REST
    }

    // REST fallback
    try {
      const res = await fetch(`${BASE_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId })
      });

      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = raw; }

      console.log('[frontend] /speak ->', res.status, data);

      if (!res.ok) {
        if (res.status === 500 && typeof data === 'string' && data.includes('MURF_API_KEY')) {
          console.warn('⚠️  Murf API key not configured. Using Web Speech API fallback.');
          await finalFallback();
          return;
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      if (!data?.audioUrl) {
        console.warn('⚠️  No audioUrl from Murf. Using fallback.');
        await finalFallback();
        return;
      }

      const audio = new Audio(data.audioUrl);
      MurfService.currentAudio = audio;
      const playPromise = new Promise<void>((resolve, reject) => {
        audio.onended = () => { MurfService.currentAudio = null; resolve(); };
        audio.onerror = (e) => { MurfService.currentAudio = null; reject(new Error('Audio playback failed')); };
      });
      audio.play().catch((e) => { MurfService.currentAudio = null; throw e; });
      await playPromise;
      console.log('✅ Murf REST TTS completed');
      return;

    } catch (error) {
      console.error('🔴 MurfService Error:', error);
      await finalFallback();
    }
  }
}
