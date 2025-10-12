import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface VoiceContextType {
  voiceId: string | null;
  setVoiceId: (id: string | null) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
};

const VOICE_STORAGE_KEY = 'swar_voice_id';

export const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [voiceId, setVoiceIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(VOICE_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (voiceId) localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
      else localStorage.removeItem(VOICE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [voiceId]);

  const setVoiceId = (id: string | null) => setVoiceIdState(id);

  return (
    <VoiceContext.Provider value={{ voiceId, setVoiceId }}>
      {children}
    </VoiceContext.Provider>
  );
};

export default VoiceContext;
