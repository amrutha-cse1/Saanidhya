import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, Calendar, Pill } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';
import ApiService from '../services/ApiService';
import reminderService from '../services/ReminderService';

interface Medicine {
  id: string;
  name: string;
  time: string;
  days: string[];
  is_active: boolean;
}

const MedicineReminder: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    time: '',
    days: [] as string[]
  });

  // Load medicines on component mount
  useEffect(() => {
    loadMedicines();
  }, []);

  // Set up medicine reminder checking
  useEffect(() => {
    const checkMedicineReminders = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // Format: HH:MM
      const currentSeconds = now.getSeconds();
      const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
      
      console.log(`[Medicine Reminder] Checking time: ${currentTime}:${currentSeconds.toString().padStart(2, '0')} on ${currentDay}`);
      
      medicines.forEach(medicine => {
        if (medicine.is_active && 
            medicine.time === currentTime && 
            currentSeconds <= 10 && // Only trigger in the first 10 seconds of the minute
            (medicine.days.length === 0 || medicine.days.includes(currentDay))) {
          
          console.log(`[Medicine Reminder] TRIGGERING reminder for ${medicine.name} at ${medicine.time}`);
          
          // Play reminder
          const message = `It's ${medicine.time}. Time to take your ${medicine.name} medicine.`;
          MurfService.playText(message, currentLanguage.code)
            .then(() => console.log(`[Medicine Reminder] Successfully played reminder for ${medicine.name}`))
            .catch(error => console.error('Failed to play medicine reminder:', error));
        }
      });
    };

    // Check every 10 seconds for better precision
    const interval = setInterval(checkMedicineReminders, 10000);
    
    // Also check immediately when medicines change
    if (medicines.length > 0) {
      checkMedicineReminders();
    }
    
    console.log(`[Medicine Reminder] Started checking for ${medicines.length} medicines`);
    
    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval);
      console.log('[Medicine Reminder] Stopped checking');
    };
  }, [medicines, currentLanguage.code]);

  const loadMedicines = async () => {
    try {
      const response = await ApiService.getMedicines();
      setMedicines(response.medicines || []);
    } catch (error) {
      console.error('Failed to load medicines:', error);
    }
  };

  const daysOfWeek = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' }
  ];

  const handleAddMedicine = async () => {
    if (newMedicine.name && newMedicine.time) {
      try {
        await ApiService.addMedicine({
          name: newMedicine.name,
          time: newMedicine.time,
          days: newMedicine.days
        });
        
        setNewMedicine({ name: '', time: '', days: [] });
        setShowAddForm(false);
        await loadMedicines(); // Reload medicines
        
        // Confirmation message
        const daysText = newMedicine.days.length > 0 
          ? `on ${newMedicine.days.join(', ')}` 
          : 'daily';
        const message = `Medicine reminder for ${newMedicine.name} has been set for ${newMedicine.time} ${daysText}.`;
        try {
          await MurfService.playText(message, currentLanguage.code);
        } catch (error) {
          console.error('Failed to play voice notification:', error);
        }
      } catch (error) {
        console.error('Failed to add medicine:', error);
      }
    }
  };

  const toggleDay = (day: string) => {
    setNewMedicine(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const toggleMedicine = async (id: string) => {
    try {
      await ApiService.toggleMedicine(id);
      await loadMedicines(); // Reload medicines to get updated status
    } catch (error) {
      console.error('Failed to toggle medicine:', error);
    }
  };

  const testReminder = async (medicine: Medicine) => {
    const message = `It's ${medicine.time}. Time to take your ${medicine.name} medicine.`;
    try {
      await MurfService.playText(message, currentLanguage.code);
    } catch (error) {
      console.error('Failed to play test reminder:', error);
    }
  };

  const checkNowForReminders = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // Format: HH:MM
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    
    const dueReminders = medicines.filter(medicine => 
      medicine.is_active && 
      medicine.time === currentTime && 
      (medicine.days.length === 0 || medicine.days.includes(currentDay))
    );

    if (dueReminders.length > 0) {
      dueReminders.forEach(medicine => {
        const message = `It's ${medicine.time}. Time to take your ${medicine.name} medicine.`;
        MurfService.playText(message, currentLanguage.code)
          .catch(error => console.error('Failed to play medicine reminder:', error));
      });
    } else {
      MurfService.playText(`It's ${currentTime}. No medicine reminders due at this time.`, currentLanguage.code)
        .catch(error => console.error('Failed to play status message:', error));
    }
  };

  const createTestReminder = async () => {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000); // Add 1 minute
    const testTime = nextMinute.toTimeString().slice(0, 5); // Format: HH:MM
    
    try {
      await ApiService.addMedicine({
        name: 'TEST Medicine',
        time: testTime,
        days: []
      });
      
      await loadMedicines(); // Reload medicines
      
      const message = `Test reminder created for ${testTime}. You should hear a reminder in about 1 minute.`;
      await MurfService.playText(message, currentLanguage.code);
    } catch (error) {
      console.error('Failed to create test reminder:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="bg-white shadow-sm">
        <div className="flex items-center p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4"
          >
            <ArrowLeft className="text-gray-600" size={24} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <Pill className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('medicineReminder')}</h1>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-600">Manage your medications</p>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${reminderService.isServiceRunning() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {reminderService.isServiceRunning() ? 'Auto-reminders ON' : 'Auto-reminders OFF'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl mb-4 flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Medicine Reminder</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={checkNowForReminders}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <Clock size={18} />
              <span>Check Current Time</span>
            </button>

            <button
              onClick={createTestReminder}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <Clock size={18} />
              <span>Create Test Reminder</span>
            </button>
          </div>

          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Add Medicine</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      value={newMedicine.name}
                      onChange={(e) => setNewMedicine(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Thyronorm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock size={16} className="inline mr-2" />
                      Time
                    </label>
                    <input
                      type="time"
                      value={newMedicine.time}
                      onChange={(e) => setNewMedicine(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} className="inline mr-2" />
                      Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {daysOfWeek.map(day => (
                        <button
                          key={day.key}
                          onClick={() => toggleDay(day.key)}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                            newMedicine.days.includes(day.key)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
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
                    onClick={handleAddMedicine}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {medicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-600">No medicine reminders yet</p>
              <p className="text-sm text-gray-500">Add your first reminder to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medicines.map(medicine => (
                <div key={medicine.id} className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        medicine.is_active ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Pill className={medicine.is_active ? 'text-green-600' : 'text-gray-400'} size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{medicine.name}</h3>
                        <p className="text-sm text-gray-600">{medicine.time}</p>
                        <p className="text-xs text-gray-500">
                          {medicine.days.length > 0 ? medicine.days.join(', ') : 'Daily'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => testReminder(medicine)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => toggleMedicine(medicine.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          medicine.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {medicine.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineReminder;
