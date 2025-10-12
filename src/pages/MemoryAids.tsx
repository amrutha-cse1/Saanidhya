import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Plus, Calendar, Gift, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';
import { format, isToday } from 'date-fns';
import ApiService from '../services/ApiService';

interface MemoryItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'birthday' | 'anniversary' | 'spiritual' | 'other';
  notes?: string;
  is_active?: boolean;
}

const MemoryAids: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    date: '',
    time: '',
    type: 'birthday' as MemoryItem['type'],
    notes: ''
  });

  // Load memory aids on component mount
  useEffect(() => {
    loadMemoryAids();
  }, []);

  const loadMemoryAids = async () => {
    try {
      const response = await ApiService.getMemoryAids();
      setMemories(response.memoryAids || []);
    } catch (error) {
      console.error('Failed to load memory aids:', error);
    }
  };

  const memoryTypes = [
    { value: 'birthday', label: 'Birthday', icon: Gift, color: 'text-pink-600' },
    { value: 'anniversary', label: 'Anniversary', icon: Heart, color: 'text-red-600' },
    { value: 'spiritual', label: 'Spiritual Date', icon: Calendar, color: 'text-purple-600' },
    { value: 'other', label: 'Other', icon: Brain, color: 'text-blue-600' }
  ];

  const getTodaysReminders = () => {
    return memories.filter(memory => isToday(new Date(memory.date)));
  };

  const handleAddMemory = async () => {
    if (newMemory.title && newMemory.date) {
      try {
        await ApiService.addMemoryAid({
          title: newMemory.title,
          date: newMemory.date,
          type: newMemory.type,
          notes: newMemory.notes,
          time: newMemory.time
        });
        
        setNewMemory({ title: '', date: '', time: '', type: 'birthday', notes: '' });
        setShowAddForm(false);
        await loadMemoryAids(); // Reload memory aids
        
        // Schedule reminder if it's today
        if (isToday(new Date(newMemory.date))) {
          const message = `Today is ${newMemory.title}! ${newMemory.notes || ''}`;
          try {
            await MurfService.playText(message, currentLanguage.code);
          } catch (error) {
            console.error('Failed to play voice reminder:', error);
          }
        }
      } catch (error) {
        console.error('Failed to add memory aid:', error);
      }
    }
  };

  const playTodaysReminders = async () => {
    const todaysReminders = getTodaysReminders();
    if (todaysReminders.length === 0) {
      await MurfService.playText('No reminders for today!', currentLanguage.code);
      return;
    }

    let message = 'Here are your reminders for today: ';
    todaysReminders.forEach((reminder, index) => {
      message += `${index + 1}. ${reminder.title}. `;
      if (reminder.notes) {
        message += `Note: ${reminder.notes}. `;
      }
    });

    await MurfService.playText(message, currentLanguage.code);
  };

  const testMemoryReminder = async (memory: MemoryItem) => {
    let message = `Memory reminder! ${memory.title}`;
    if (memory.notes) {
      message += `. ${memory.notes}`;
    }
    if (memory.type === 'birthday') {
      message += '. Don\'t forget to call and wish them!';
    } else if (memory.type === 'anniversary') {
      message += '. This is an important anniversary!';
    }
    
    try {
      await MurfService.playText(message, currentLanguage.code);
    } catch (error) {
      console.error('Failed to play test memory reminder:', error);
    }
  };

  const getTypeInfo = (type: MemoryItem['type']) => {
    return memoryTypes.find(t => t.value === type) || memoryTypes[0];
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
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('memoryAids')}</h1>
              <p className="text-sm text-gray-600">Remember important dates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Today's Reminders */}
          {getTodaysReminders().length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Today's Reminders</h2>
                <button
                  onClick={playTodaysReminders}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Play All
                </button>
              </div>
              <div className="space-y-3">
                {getTodaysReminders().map(reminder => {
                  const typeInfo = getTypeInfo(reminder.type);
                  const IconComponent = typeInfo.icon;
                  return (
                    <div key={reminder.id} className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                      <IconComponent className={typeInfo.color} size={20} />
                      <div>
                        <h3 className="font-medium text-gray-800">{reminder.title}</h3>
                        {reminder.notes && (
                          <p className="text-sm text-gray-600">{reminder.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Memory Reminder</span>
          </button>

          {/* Add Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Add Memory Reminder</h2>
                
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newMemory.title}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Mom's Birthday"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newMemory.date}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={newMemory.time}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set a time to get voice reminders to call or remember this event
                    </p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={newMemory.type}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, type: e.target.value as MemoryItem['type'] }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {memoryTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={newMemory.notes}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Any additional notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMemory}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All Memories */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">All Reminders</h2>
            
            {memories.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">No memories added yet</p>
                <p className="text-sm text-gray-500">Add your first reminder to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map(memory => {
                  const typeInfo = getTypeInfo(memory.type);
                  const IconComponent = typeInfo.icon;
                  const isUpcoming = isToday(new Date(memory.date));
                  
                  return (
                    <div 
                      key={memory.id} 
                      className={`flex items-center space-x-3 p-3 rounded-lg ${
                        isUpcoming ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                      }`}
                    >
                      <IconComponent className={typeInfo.color} size={20} />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{memory.title}</h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(memory.date), 'MMM dd, yyyy')}
                          {memory.time && (
                            <span className="ml-2 text-purple-600 font-medium">
                              📢 {memory.time}
                            </span>
                          )}
                        </p>
                        {memory.notes && (
                          <p className="text-xs text-gray-500">{memory.notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {memory.time && (
                          <button
                            onClick={() => testMemoryReminder(memory)}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            Test
                          </button>
                        )}
                        {isUpcoming && (
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryAids;