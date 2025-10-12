import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot as Lotus, Play, Pause, Square, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';

const Meditation: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [meditationType, setMeditationType] = useState<'meditation' | 'prayer'>('meditation');

  const durations = [5, 10, 15, 20, 30];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setTimeRemaining(selectedDuration * 60);
    setIsPlaying(true);

    // Start with Murf voice guidance
    const startMessage = meditationType === 'meditation' 
      ? `Starting your ${selectedDuration} minute meditation session. Find a comfortable position and close your eyes. Let's begin with deep breathing. Breathe in slowly... and breathe out.`
      : `Starting your ${selectedDuration} minute prayer session. Find a quiet space and center yourself. Take a moment to connect with your inner peace.`;

    await MurfService.playText(startMessage, currentLanguage.code);

    // Periodic guidance during session
    if (selectedDuration >= 10) {
      setTimeout(async () => {
        if (isPlaying) {
          const midMessage = meditationType === 'meditation'
            ? 'Continue breathing deeply. Focus on your breath. Let any thoughts pass by like clouds in the sky.'
            : 'Take this moment to reflect and find peace within yourself.';
          await MurfService.playText(midMessage, currentLanguage.code);
        }
      }, (selectedDuration * 60 * 1000) / 2); // Halfway through
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleResume = async () => {
    setIsPlaying(true);
    await MurfService.playText('Resuming your session. Continue breathing deeply.', currentLanguage.code);
  };

  const handleStop = async () => {
    setIsPlaying(false);
    setTimeRemaining(0);
    await MurfService.playText('Session ended. Take a moment to appreciate this peaceful time.', currentLanguage.code);
  };

  const handleSessionComplete = async () => {
    const completionMessage = meditationType === 'meditation'
      ? `Your ${selectedDuration} minute meditation session is complete. Take a moment to notice how you feel. Slowly open your eyes when you're ready.`
      : `Your ${selectedDuration} minute prayer session is complete. May you carry this peace with you throughout your day.`;

    await MurfService.playText(completionMessage, currentLanguage.code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4"
          >
            <ArrowLeft className="text-gray-600" size={24} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center">
              <Lotus className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('meditation')}</h1>
              <p className="text-sm text-gray-600">Guided meditation & prayer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Mode Selection */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose Mode</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMeditationType('meditation')}
                className={`p-4 rounded-lg text-center transition-all ${
                  meditationType === 'meditation'
                    ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Lotus className="mx-auto mb-2" size={24} />
                <div className="font-medium">Meditation</div>
              </button>
              <button
                onClick={() => setMeditationType('prayer')}
                className={`p-4 rounded-lg text-center transition-all ${
                  meditationType === 'prayer'
                    ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="mx-auto mb-2" size={24} />
                <div className="font-medium">Prayer</div>
              </button>
            </div>
          </div>

          {/* Duration Selection */}
          {!isPlaying && timeRemaining === 0 && (
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Duration</h2>
              <div className="grid grid-cols-3 gap-3">
                {durations.map(duration => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`p-4 rounded-lg text-center transition-all ${
                      selectedDuration === duration
                        ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                        : 'bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xl font-bold">{duration}</div>
                    <div className="text-sm">min</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timer Display */}
          {(isPlaying || timeRemaining > 0) && (
            <div className="bg-white rounded-xl p-8 shadow-md text-center">
              <div className="text-6xl font-light text-gray-800 mb-4">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-600 mb-6">
                {meditationType === 'meditation' ? 'Meditation' : 'Prayer'} Session
              </div>
              
              {/* Progress Circle */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="#6366f1"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - (selectedDuration * 60 - timeRemaining) / (selectedDuration * 60))}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lotus className="text-indigo-500" size={32} />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center space-x-4">
                {!isPlaying && timeRemaining > 0 && (
                  <button
                    onClick={handleResume}
                    className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-colors"
                  >
                    <Play size={24} />
                  </button>
                )}
                {isPlaying && (
                  <button
                    onClick={handlePause}
                    className="p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg transition-colors"
                  >
                    <Pause size={24} />
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                >
                  <Square size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Start Button */}
          {!isPlaying && timeRemaining === 0 && (
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-3"
            >
              <Play size={24} />
              <span>Start {meditationType === 'meditation' ? 'Meditation' : 'Prayer'}</span>
            </button>
          )}

          {/* Instructions */}
          <div className="bg-indigo-50 rounded-xl p-4">
            <h3 className="font-semibold text-indigo-800 mb-2">Tips for a Better Session</h3>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• Find a quiet, comfortable space</li>
              <li>• Sit with your back straight</li>
              <li>• Close your eyes or soften your gaze</li>
              <li>• Focus on your breath</li>
              <li>• Let thoughts pass without judgment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meditation;