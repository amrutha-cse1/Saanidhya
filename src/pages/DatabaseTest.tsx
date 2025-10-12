import React, { useState } from 'react';
import ApiService from '../services/ApiService';

const DatabaseTest: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [moodEntries, setMoodEntries] = useState<any[]>([]);
  const [memoryAids, setMemoryAids] = useState<any[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Test user signup/signin
  const testAuth = async () => {
    setLoading(true);
    try {
      const signupResult = await ApiService.signup({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User'
      });
      setUser(signupResult.user);
      setMessage('User signup successful!');
      
      // Load all data after signup
      await loadAllData();
    } catch (error: any) {
      setMessage(`Auth error: ${error.message}`);
    }
    setLoading(false);
  };

  // Load all data
  const loadAllData = async () => {
    try {
      const [medicinesRes, moodRes, memoryRes, emergencyRes] = await Promise.all([
        ApiService.getMedicines(),
        ApiService.getMoodEntries(),
        ApiService.getMemoryAids(),
        ApiService.getEmergencyContacts()
      ]);

      setMedicines(medicinesRes.medicines || []);
      setMoodEntries(moodRes.moodEntries || []);
      setMemoryAids(memoryRes.memoryAids || []);
      setEmergencyContacts(emergencyRes.contacts || []);
    } catch (error: any) {
      setMessage(`Load error: ${error.message}`);
    }
  };

  // Test adding medicine
  const testAddMedicine = async () => {
    try {
      await ApiService.addMedicine({
        name: 'Vitamin D',
        time: '09:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri']
      });
      setMessage('Medicine added successfully!');
      await loadAllData();
    } catch (error: any) {
      setMessage(`Medicine error: ${error.message}`);
    }
  };

  // Test adding mood entry
  const testAddMoodEntry = async () => {
    try {
      await ApiService.addMoodEntry({
        mood: 'happy',
        activity_type: 'music',
        activity_content: 'Listened to relaxing music',
        interests: ['Music', 'Art'],
        notes: 'Feeling great today!'
      });
      setMessage('Mood entry added successfully!');
      await loadAllData();
    } catch (error: any) {
      setMessage(`Mood error: ${error.message}`);
    }
  };

  // Test adding memory aid
  const testAddMemoryAid = async () => {
    try {
      await ApiService.addMemoryAid({
        title: 'Doctor Appointment',
        date: new Date().toISOString().split('T')[0],
        type: 'other',
        notes: 'Annual checkup with Dr. Smith'
      });
      setMessage('Memory aid added successfully!');
      await loadAllData();
    } catch (error: any) {
      setMessage(`Memory error: ${error.message}`);
    }
  };

  // Test adding emergency contact
  const testAddEmergencyContact = async () => {
    try {
      await ApiService.addEmergencyContact({
        name: 'John Doe',
        phone: '+91 98765 43210',
        relationship: 'Son',
        is_primary: true
      });
      setMessage('Emergency contact added successfully!');
      await loadAllData();
    } catch (error: any) {
      setMessage(`Emergency contact error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Database Test Page</h1>
        
        {/* Status message */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* Auth section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Test</h2>
          <button
            onClick={testAuth}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Signup & Login'}
          </button>
          {user && (
            <div className="mt-4 p-3 bg-green-50 rounded">
              <p><strong>User:</strong> {user.name} ({user.email})</p>
            </div>
          )}
        </div>

        {/* Test buttons */}
        {user && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Database Operations Test</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={testAddMedicine}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Medicine
              </button>
              <button
                onClick={testAddMoodEntry}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                Add Mood Entry
              </button>
              <button
                onClick={testAddMemoryAid}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                Add Memory Aid
              </button>
              <button
                onClick={testAddEmergencyContact}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Add Emergency Contact
              </button>
            </div>
          </div>
        )}

        {/* Data display */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medicines */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Medicines ({medicines.length})</h3>
              {medicines.map((medicine, index) => (
                <div key={index} className="border-b py-2 last:border-b-0">
                  <p><strong>{medicine.name}</strong> at {medicine.time}</p>
                  <p className="text-sm text-gray-600">Days: {medicine.days.join(', ')}</p>
                  <p className="text-sm text-gray-600">Active: {medicine.is_active ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>

            {/* Mood Entries */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Mood Entries ({moodEntries.length})</h3>
              {moodEntries.map((entry, index) => (
                <div key={index} className="border-b py-2 last:border-b-0">
                  <p><strong>Mood:</strong> {entry.mood}</p>
                  <p className="text-sm text-gray-600">Activity: {entry.activity_type}</p>
                  <p className="text-sm text-gray-600">Interests: {entry.interests?.join(', ')}</p>
                </div>
              ))}
            </div>

            {/* Memory Aids */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Memory Aids ({memoryAids.length})</h3>
              {memoryAids.map((aid, index) => (
                <div key={index} className="border-b py-2 last:border-b-0">
                  <p><strong>{aid.title}</strong></p>
                  <p className="text-sm text-gray-600">Date: {aid.date}</p>
                  <p className="text-sm text-gray-600">Type: {aid.type}</p>
                  <p className="text-sm text-gray-600">Notes: {aid.notes}</p>
                </div>
              ))}
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Emergency Contacts ({emergencyContacts.length})</h3>
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="border-b py-2 last:border-b-0">
                  <p><strong>{contact.name}</strong> {contact.is_primary && '(Primary)'}</p>
                  <p className="text-sm text-gray-600">Phone: {contact.phone}</p>
                  <p className="text-sm text-gray-600">Relationship: {contact.relationship}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseTest;
