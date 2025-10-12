import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Music, MessageCircle, Lightbulb } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';
import ApiService from '../services/ApiService';

interface MoodActivity {
  type: 'music' | 'quote' | 'joke' | 'trivia';
  content: string;
}

const MoodBased: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [currentActivity, setCurrentActivity] = useState<MoodActivity | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Load mood data on component mount
  useEffect(() => {
    loadMoodData();
  }, []);

  const loadMoodData = async () => {
    try {
      const interestsResponse = await ApiService.getUserInterests();
      
      // Set user interests from most common ones
      const topInterests = (interestsResponse.interests || [])
        .slice(0, 5)
        .map((item: any) => item.interest);
      setUserInterests(topInterests);
    } catch (error) {
      console.error('Failed to load mood data:', error);
    }
  };

  const moods = [
    { 
      emoji: '😞', 
      label: 'Sad', 
      value: 'sad',
      color: 'from-blue-400 to-blue-600',
      activities: ['music', 'quote']
    },
    { 
      emoji: '😐', 
      label: 'Normal', 
      value: 'normal',
      color: 'from-yellow-400 to-yellow-600',
      activities: ['trivia', 'music']
    },
    { 
      emoji: '😊', 
      label: 'Happy', 
      value: 'happy',
      color: 'from-green-400 to-green-600',
      activities: ['music', 'joke']
    }
  ];

  const interests = [
    'Music', 'Books', 'Movies', 'Sports', 'Travel', 'Cooking', 
    'Art', 'Science', 'History', 'Nature', 'Technology', 'Yoga'
  ];

  const moodContent = {
    sad: {
      music: 'Playing soothing classical music to help you relax and feel better.',
      quote: 'Remember: Every storm runs out of rain. This difficult time will pass, and brighter days are ahead. You are stronger than you think.'
    },
    normal: {
      trivia: 'Here\'s an interesting fact: Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.',
      music: 'Let me play some uplifting music to brighten your day!'
    },
    happy: {
      music: 'Great to hear you\'re happy! Here\'s some energetic music to keep your spirits high!',
      joke: 'Why don\'t scientists trust atoms? Because they make up everything! Hope that made you smile even more!'
    }
  };

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    
    const moodData = moods.find(m => m.value === mood);
    if (!moodData) return;

    // Select activity based on mood and user interests
    const availableActivities = moodData.activities;
    const selectedActivityType = availableActivities[Math.floor(Math.random() * availableActivities.length)] as 'music' | 'quote' | 'joke' | 'trivia';
    
    const content = moodContent[mood as keyof typeof moodContent][selectedActivityType as keyof (typeof moodContent)[keyof typeof moodContent]];
    
    const activity: MoodActivity = {
      type: selectedActivityType,
      content
    };

    setCurrentActivity(activity);

    // Save mood entry to database
    try {
      await ApiService.addMoodEntry({
        mood,
        activity_type: selectedActivityType,
        activity_content: content,
        interests: userInterests,
        notes: `Feeling ${mood} today`
      });
      await loadMoodData(); // Refresh mood data
    } catch (error) {
      console.error('Failed to save mood entry:', error);
    }

    // Provide personalized response based on mood
    let response = '';
    if (mood === 'sad') {
      response = `I understand you're feeling sad. ${content} Take your time, and remember that it's okay to feel this way.`;
    } else if (mood === 'normal') {
      response = `You're feeling okay today. ${content}`;
    } else if (mood === 'happy') {
      response = `Wonderful to hear you're happy! ${content}`;
    }

    await MurfService.playText(response, currentLanguage.code);
  };

  const toggleInterest = (interest: string) => {
    setUserInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handlePersonalizedActivity = async () => {
    if (userInterests.length === 0 || !selectedMood) return;

    const randomInterest = userInterests[Math.floor(Math.random() * userInterests.length)];
    let personalizedContent = '';

    if (selectedMood === 'sad') {
      personalizedContent = `Since you enjoy ${randomInterest}, here's something uplifting: Why not try exploring new ${randomInterest.toLowerCase()} content? It might help lift your spirits.`;
    } else if (selectedMood === 'normal') {
      personalizedContent = `I see you're interested in ${randomInterest}. Here's a fun activity: Try learning something new about ${randomInterest.toLowerCase()} today!`;
    } else if (selectedMood === 'happy') {
      personalizedContent = `Your love for ${randomInterest} is wonderful! Why not share your enthusiasm with someone today or dive deeper into your ${randomInterest.toLowerCase()} hobby?`;
    }

    await MurfService.playText(personalizedContent, currentLanguage.code);
    
    setCurrentActivity({
      type: 'quote',
      content: personalizedContent
    });
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
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
              <Heart className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('moodBased')}</h1>
              <p className="text-sm text-gray-600">Mood-based assistance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Interests Setup */}
          {userInterests.length === 0 && (
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                First, let's personalize your experience
              </h2>
              <p className="text-gray-600 mb-4">Select your interests so I can provide better assistance:</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {interests.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userInterests.includes(interest)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mood Selection */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              How are you feeling today?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {moods.map(mood => (
                <button
                  key={mood.value}
                  onClick={() => handleMoodSelect(mood.value)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                    selectedMood === mood.value
                      ? 'border-pink-500 bg-pink-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-4xl mb-3">{mood.emoji}</div>
                  <h3 className="font-semibold text-gray-800">{mood.label}</h3>
                </button>
              ))}
            </div>
          </div>

          {/* Current Activity */}
          {currentActivity && (
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                {currentActivity.type === 'music' && <Music className="text-purple-600" size={24} />}
                {currentActivity.type === 'quote' && <MessageCircle className="text-blue-600" size={24} />}
                {currentActivity.type === 'joke' && <Heart className="text-red-600" size={24} />}
                {currentActivity.type === 'trivia' && <Lightbulb className="text-yellow-600" size={24} />}
                <h3 className="font-semibold text-gray-800 capitalize">
                  {currentActivity.type} for You
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{currentActivity.content}</p>
            </div>
          )}

          {/* Personalized Activity Button */}
          {userInterests.length > 0 && selectedMood && (
            <button
              onClick={handlePersonalizedActivity}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              Get Personalized Activity
            </button>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setUserInterests([])}
              className="py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Reset Interests
            </button>
            <button
              onClick={() => {
                setSelectedMood('');
                setCurrentActivity(null);
              }}
              className="py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Reset Mood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodBased;