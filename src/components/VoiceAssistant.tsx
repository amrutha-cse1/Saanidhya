import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';
import { useVoice } from '../contexts/VoiceContext';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';

const VoiceAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const { currentLanguage, t } = useLanguage();
  const { voiceId } = useVoice();
  const navigate = useNavigate();

  const [expectingConfirmation, setExpectingConfirmation] = useState(false);
  const pendingIntentRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = currentLanguage.code || 'en-US';

      recognitionInstance.onresult = async (event: any) => {
        const transcriptRaw: string = event.results[event.results.length - 1][0].transcript;
        const transcript: string = transcriptRaw.toLowerCase();
        console.log('[VoiceAssistant] heard ->', transcript);

        // After we get STT, call sentiment endpoint to get user mood baseline
        try {
          const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';
          const resp = await fetch(`${base}/api/sentiment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcriptRaw })
          });
          const data = await resp.json().catch(() => ({}));
          const sentiment = data?.sentiment || 'neutral';
          // Empathetic response depending on sentiment
          if (sentiment === 'negative') {
            MurfService.playText("I'm sorry you're feeling that way. I'm here for you — would you like to talk about it or try a short calming exercise?", voiceId || currentLanguage.code);
          } else if (sentiment === 'positive') {
            MurfService.playText('That sounds good to hear! Would you like some uplifting music or a short breathing exercise?', voiceId || currentLanguage.code);
          } else {
            // neutral: keep going with command handling
            // continue below
          }
        } catch (e) {
          console.warn('Sentiment call failed', e);
        }

        if (expectingConfirmation) {
          handleConfirmationResponse(transcript);
          return;
        }

        // Wake word handling (optional)
  if (transcript.includes('hello sakhi') || transcript.includes('hello swarathi') || transcript.includes('hey saanidhya') || transcript.includes('hey sakhi')) {
          MurfService.playText('Yes? How can I help you?', voiceId || currentLanguage.code);
          return;
        }

        if (isListening) {
          const intent = parseIntent(transcript);
          if (intent) processIntent(intent);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        if (isListening) {
          try { recognitionInstance.start(); } catch { /* ignore */ }
        }
      };

      setRecognition(recognitionInstance);
    }
  }, [currentLanguage, isListening, expectingConfirmation, voiceId]);

  const parseIntent = (text: string) => {
    const t = text.toLowerCase();

    if (t.includes('remind me to')) {
      const match = t.match(/remind me to (.+?)( at (\d{1,2}(?::\d{2})? ?(am|pm)?))?$/i);
      const reminderText = match ? match[1] : t.replace('remind me to', '').trim();
      const time = match && match[2] ? match[2] : null;
      return { type: 'create_reminder', text: reminderText, time };
    }

    if (t.includes('list reminders') || t.includes('what reminders') || t.includes('upcoming reminders') || t.includes('my reminders')) {
      return { type: 'list_upcoming_reminders' };
    }

    if (t.includes('medicine') || t.includes('medication') || t.includes('take medicine')) return { type: 'open_medicine' };
    if (t.includes('news') || t.includes('read news') || t.includes('latest news')) return { type: 'open_news' };
    if (t.includes('aarti') || t.includes('bhajan') || t.includes('prayer') || t.includes('devotional')) return { type: 'open_devotional' };
    if (t.includes('call') || t.includes('call my') || t.includes('emergency')) {
      const m = t.match(/call (my )?([a-zA-Z ]+)/i);
      const name = m ? m[2].trim() : null;
      return { type: 'call_contact', name };
    }
    if (t.includes('feeling') || t.includes('mood') || t.includes('i am sad') || t.includes('i am happy')) return { type: 'open_mood' };

    return { type: 'small_talk', text };
  };

  const handleConfirmationResponse = (transcript: string) => {
    const yes = /\b(yes|yeah|yup|sure|please do|do it|confirm)\b/.test(transcript);
    const no = /\b(no|nah|cancel|don't|do not|stop)\b/.test(transcript);

    if (yes) {
      const intent = pendingIntentRef.current;
      pendingIntentRef.current = null;
      setExpectingConfirmation(false);
      if (intent) executeIntent(intent);
    } else if (no) {
      pendingIntentRef.current = null;
      setExpectingConfirmation(false);
      MurfService.playText("Okay, I won't do that.", voiceId || currentLanguage.code);
    } else {
      MurfService.playText('Please say yes or no.', voiceId || currentLanguage.code);
    }
  };

  const processIntent = (intent: any) => {
    console.log('[VoiceAssistant] processing intent', intent);
    if (intent.type === 'call_contact') {
      const displayName = intent.name || 'your contact';
      pendingIntentRef.current = intent;
      setExpectingConfirmation(true);
      MurfService.playText(`Do you want me to call ${displayName}? Say yes or no.`, voiceId || currentLanguage.code);
      return;
    }
    executeIntent(intent);
  };

  const executeIntent = async (intent: any) => {
    try {
      switch (intent.type) {
        case 'create_reminder': {
          const title = intent.text || 'Reminder';
          const date = new Date().toISOString();
          await ApiService.addMemoryAid({ title, date, type: 'reminder', notes: intent.time || '' }).catch(() => null);
          await MurfService.playText(`Okay, I set a reminder for ${title}.`, voiceId || currentLanguage.code);
          break;
        }
        case 'open_medicine': {
          navigate('/medicine-reminder');
          await MurfService.playText('Opening medicine reminders for you.', voiceId || currentLanguage.code);
          break;
        }
        case 'open_news': {
          navigate('/news-reader');
          await MurfService.playText('Let me get the latest news for you.', voiceId || currentLanguage.code);
          break;
        }
        case 'open_devotional': {
          navigate('/');
          await MurfService.playText('Playing devotional content for you.', voiceId || currentLanguage.code);
          break;
        }
        case 'call_contact': {
          const contacts = await ApiService.getEmergencyContacts().catch(() => []);
          let target = null;
          if (intent.name && contacts && contacts.length) target = contacts.find((c: any) => c.name?.toLowerCase().includes((intent.name || '').toLowerCase()));
          if (target) {
            await MurfService.playText(`Calling ${target.name} now.`, voiceId || currentLanguage.code);
          } else {
            await MurfService.playText(`I couldn't find that contact. I will call your primary contact.`, voiceId || currentLanguage.code);
            const primary = await ApiService.getPrimaryContact().catch(() => null);
            if (primary) await MurfService.playText(`Calling ${primary.name} now.`, voiceId || currentLanguage.code);
            else await MurfService.playText('No emergency contact configured.', voiceId || currentLanguage.code);
          }
          break;
        }
        case 'open_mood': {
          navigate('/mood-based');
          await MurfService.playText('How are you feeling today? I can help improve your mood.', voiceId || currentLanguage.code);
          break;
        }
        case 'list_upcoming_reminders': {
          const upcoming = await ApiService.getUpcomingReminders().catch(() => ({ upcomingReminders: [] }));
          const list = upcoming?.upcomingReminders || [];
          if (!list.length) {
            await MurfService.playText('You have no upcoming reminders in the next few days.', voiceId || currentLanguage.code);
          } else {
            await MurfService.playText(`You have ${list.length} upcoming reminders.`, voiceId || currentLanguage.code);
            for (const r of list) {
              const when = r.date || r.time || 'soon';
              await MurfService.playText(`${r.title} on ${when}`, voiceId || currentLanguage.code);
            }
          }
          break;
        }
        case 'small_talk':
        default: {
          await MurfService.playText('Hello! I am Saanidhya, your caring voice assistant. How can I help you today?', voiceId || currentLanguage.code);
        }
      }
    } catch (err) {
      console.error('Intent execution error', err);
      await MurfService.playText('Sorry, something went wrong while performing that action.', voiceId || currentLanguage.code);
    }
  };

  const toggleListening = () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
        setIsListening(true);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleListening}
        className={`voice-fab large-btn rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        title={isListening ? 'Stop listening' : 'Start voice assistant'}
        aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
      >
        {isListening ? <MicOff size={32} /> : <Mic size={32} />}
      </button>

      {isListening && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg p-3 whitespace-nowrap">
          <p className="text-sm text-gray-600">{t('voiceListening') || 'Listening... Say "Hello Sakhi"'}</p>
        </div>
      )}
    </div>
  );
};

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default VoiceAssistant;