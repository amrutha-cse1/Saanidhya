import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { VoiceProvider } from './contexts/VoiceContext';
import reminderService from './services/ReminderService';

import LandingPage from './pages/LandingPage';
import LanguageSelection from './pages/LanguageSelection';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import MedicineReminder from './pages/MedicineReminder';
import NewsReader from './pages/NewsReader';
import MoodBased from './pages/MoodBased';
import MemoryAids from './pages/MemoryAids';
import Meditation from './pages/Meditation';
import EmergencyCalls from './pages/EmergencyCalls';
import Chat from './pages/Chat';
import DatabaseTest from './pages/DatabaseTest';
import VoiceAssistant from './components/VoiceAssistant';
import VoiceMessages from './pages/VoiceMessages';
import FamilyUpload from './pages/FamilyUpload';
import FamilyTokens from './pages/FamilyTokens';

function AppContent() {
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    try {
      reminderService.start(currentLanguage.code);
      reminderService.updateLanguage(currentLanguage.code);
      console.log(`[App] Started global reminder service with language: ${currentLanguage.code}`);
    } catch (e) {
      console.warn('Reminder service failed to start', e);
    }

    return () => {
      try {
        reminderService.stop();
      } catch (e) {
        // ignore
      }
    };
  }, [currentLanguage.code]);

  return (
    <Router>
      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg.jpg')",
        }}
      >
        {/* Pink overlay */}
        <div className="absolute inset-0 bg-pink-500/40"></div>

        {/* Your original app content */}
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/language-selection" element={<LanguageSelection />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/medicine-reminder" element={<MedicineReminder />} />
            <Route path="/news-reader" element={<NewsReader />} />
            <Route path="/mood-based" element={<MoodBased />} />
            <Route path="/memory-aids" element={<MemoryAids />} />
            <Route path="/meditation" element={<Meditation />} />
            <Route path="/emergency-calls" element={<EmergencyCalls />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/voice-messages" element={<VoiceMessages />} />
            <Route path="/family-upload" element={<FamilyUpload />} />
            <Route path="/family-tokens" element={<FamilyTokens />} />
            <Route path="/database-test" element={<DatabaseTest />} />
          </Routes>
          <VoiceAssistant />
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <VoiceProvider>
          <AppContent />
        </VoiceProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
