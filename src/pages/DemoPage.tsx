import React from 'react';
import { Play, Users, Clock, Brain, Phone } from 'lucide-react';
import { MurfService } from '../services/MurfService';

const DemoPage: React.FC = () => {
  const testVoice = async (text: string) => {
    try {
      await MurfService.playText(text);
    } catch (error) {
      console.error('Voice test failed:', error);
    }
  };

  const demoFeatures = [
    {
      icon: Clock,
      title: "Medicine Reminders",
      description: "Set time-based voice reminders for medications",
      demo: "It's time to take your blood pressure medicine!"
    },
    {
      icon: Brain,
      title: "Memory Aids", 
      description: "Voice reminders for important dates and events",
      demo: "Memory reminder! Today is your grandson's birthday. Don't forget to call and wish them!"
    },
    {
      icon: Phone,
      title: "Emergency Calls",
      description: "Quick access to emergency contacts",
      demo: "Emergency contact activated. Calling your primary contact now."
    },
    {
      icon: Users,
      title: "Voice Assistant",
      description: "Conversational AI for eldercare support",
  demo: "Hello! I'm your Saanidhya voice assistant. How can I help you today?"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🗣️ Saanidhya Voice Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the power of AI-driven voice assistance for eldercare. 
            Click the play buttons to hear how Saanidhya communicates with users.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demoFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg mr-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">{feature.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-4">{feature.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm italic text-gray-700">"{feature.demo}"</p>
                </div>
                
                <button
                  onClick={() => testVoice(feature.demo)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Play Demo
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Perfect for Murf AI Challenge</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800">✅ Uses Murf TTS API</h4>
              <p className="text-sm text-green-600">Integrated voice synthesis</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">🤖 Conversational AI</h4>
              <p className="text-sm text-blue-600">Voice-first interaction</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800">🎯 Real-world Impact</h4>
              <p className="text-sm text-purple-600">Eldercare assistance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
