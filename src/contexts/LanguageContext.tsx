import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

const translations: Record<string, Record<string, string>> = {
  en: {
  appName: 'Saanidhya',
    tagline: 'A Caring Voice for Every Step',
    getStarted: 'Get Started',
    selectLanguage: 'Select Your Language',
    continue: 'Continue',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    login: 'Login',
    register: 'Register',
    medicineReminder: 'Medicine Reminder',
    newsReader: 'News Reader',
    moodBased: 'Mood Based',
    memoryAids: 'Memory Aids',
    meditation: 'Meditation',
    emergencyCalls: 'Emergency Calls',
  welcome: 'Welcome to Saanidhya',
    chooseFeature: 'Choose a feature to get started',
    voiceListening: 'Listening... Say "Hello Sakhi"',
    voiceStopListening: 'Stop listening',
    voiceStartListening: 'Start voice assistant',
  },
  hi: {
    appName: 'स्वरसाथी',
    tagline: 'हर कदम के लिए एक देखभाल करने वाली आवाज',
    getStarted: 'शुरू करें',
    selectLanguage: 'अपनी भाषा चुनें',
    continue: 'आगे बढ़ें',
    signIn: 'साइन इन',
    signUp: 'साइन अप',
    email: 'ईमेल',
    password: 'पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    login: 'लॉगिन',
    register: 'पंजीकरण',
    medicineReminder: 'दवा रिमाइंडर',
    newsReader: 'समाचार पाठक',
    moodBased: 'मूड आधारित',
    memoryAids: 'स्मृति सहायक',
    meditation: 'ध्यान',
    emergencyCalls: 'आपातकालीन कॉल',
    welcome: 'स्वरसाथी में आपका स्वागत है',
    chooseFeature: 'शुरू करने के लिए एक सुविधा चुनें',
    voiceListening: 'सुन रहा हूं... "हैलो सखी" कहें',
    voiceStopListening: 'सुनना बंद करें',
    voiceStartListening: 'वॉयस असिस्टेंट शुरू करें',
  },
  te: {
    appName: 'స్వరసాథి',
    tagline: 'ప్రతి అడుగుకు శ్రద్ధగల స్వరం',
    getStarted: 'ప్రారంభించండి',
    selectLanguage: 'మీ భాషను ఎంచుకోండి',
    continue: 'కొనసాగించండి',
    signIn: 'సైన్ ఇన్',
    signUp: 'సైన్ అప్',
    email: 'ఈమెయిల్',
    password: 'పాస్‌వర్డ్',
    confirmPassword: 'పాస్‌వర్డ్ ధృవీకరించండి',
    login: 'లాగిన్',
    register: 'నమోదు',
    medicineReminder: 'మందుల రిమైండర్',
    newsReader: 'వార్తల పఠన',
    moodBased: 'మూడ్ ఆధారిత',
    memoryAids: 'జ్ఞాపక సహాయకులు',
    meditation: 'ధ్యానం',
    emergencyCalls: 'అత్యవసర కాల్స్',
    welcome: 'స్వరసాథికి స్వాగతం',
    chooseFeature: 'ప్రారంభించడానికి ఒక ఫీచర్ ఎంచుకోండి',
    voiceListening: 'వింటున్నాను... "హలో సఖి" అని చెప్పండి',
    voiceStopListening: 'వినడం ఆపండి',
    voiceStartListening: 'వాయిస్ అసిస్టెంట్ ప్రారంభించండి',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
  };

  const t = (key: string): string => {
    return translations[currentLanguage.code]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { languages };