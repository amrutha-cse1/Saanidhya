// Minimal global types for browser SpeechRecognition APIs used by the voice assistant
interface SpeechRecognitionEventResult {
  transcript: string;
}

interface SpeechRecognitionEvent {
  results: any;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: any) => void) | null;
  onend: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
}

interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export {};
