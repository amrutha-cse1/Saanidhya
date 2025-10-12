import React from 'react';
import { useNavigate } from 'react-router-dom';
import { languages, useLanguage } from '../contexts/LanguageContext';

const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = (language: typeof languages[0]) => {
    setLanguage(language);
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Select Language</h1>
          <p className="text-gray-600">Choose your preferred language</p>
        </div>

        <div className="space-y-4">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language)}
              className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
                    {language.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{language.nativeName}</p>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-blue-500 transition-colors"></div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/signin')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip language selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
