import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Newspaper, Heart, Brain, Bot as Lotus, Phone, User, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { MurfService } from '../services/MurfService';
import VoiceSettings from '../components/VoiceSettings';
import Chat from './Chat';
import { useVoice } from '../contexts/VoiceContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { voiceId } = useVoice();

  const features = [
    { id: 'medicine-reminder', icon: Pill, title: t('medicineReminder'), description: 'Set medication reminders', color: 'from-green-400 to-green-600', route: '/medicine-reminder' },
    { id: 'news-reader', icon: Newspaper, title: t('newsReader'), description: 'Listen to latest news', color: 'from-blue-400 to-blue-600', route: '/news-reader' },
    { id: 'mood-based', icon: Heart, title: t('moodBased'), description: 'Mood-based assistance', color: 'from-pink-400 to-pink-600', route: '/mood-based' },
    { id: 'memory-aids', icon: Brain, title: t('memoryAids'), description: 'Remember important dates', color: 'from-purple-400 to-purple-600', route: '/memory-aids' },
    { id: 'meditation', icon: Lotus, title: t('meditation'), description: 'Guided meditation sessions', color: 'from-indigo-400 to-indigo-600', route: '/meditation' },
    { id: 'emergency-calls', icon: Phone, title: t('emergencyCalls'), description: 'Emergency contacts', color: 'from-red-400 to-red-600', route: '/emergency-calls' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('welcome')}</h1>
              <p className="text-sm text-gray-600">{user?.name || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-56">
              <VoiceSettings />
            </div>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <LogOut className="text-gray-600" size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600 mb-8">{t('chooseFeature')}</p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const IconComponent = feature.icon as any;
              return (
                <button key={feature.id} onClick={() => navigate(feature.route)} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="text-white" size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </button>
              );
            })}
          </div>

          {/* Embedded Chat panel */}
          <div className="mt-8 bg-white rounded-xl p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-3">Quick Chat</h2>
            <p className="text-sm text-gray-500 mb-3">Ask quick questions or get help without leaving the dashboard.</p>
            <Chat />
          </div>
          {/* Test Murf Voice button removed per request */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;