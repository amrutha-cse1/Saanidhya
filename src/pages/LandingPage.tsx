import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleGetStarted = () => {
    navigate('/language-selection');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-orange-100 opacity-90"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* App Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
            <Heart className="text-white" size={40} />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4 tracking-wide">
          {t('appName')}
        </h1>

        {/* Tagline */}
        <p className="text-lg text-gray-600 mb-12 leading-relaxed">
          {t('tagline')}
        </p>

        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          {t('getStarted')}
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-16 h-16 bg-orange-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/3 right-20 w-12 h-12 bg-green-200 rounded-full opacity-20 animate-pulse delay-500"></div>
    </div>
  );
};

export default LandingPage;