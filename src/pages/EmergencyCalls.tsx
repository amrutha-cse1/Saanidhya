import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Plus, Edit3, Trash2, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MurfService } from '../services/MurfService';
import ApiService from '../services/ApiService';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

const EmergencyCalls: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
    is_primary: false
  });

  // Load contacts on component mount
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await ApiService.getEmergencyContacts();
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  };

  const relationships = [
    'Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Doctor', 
    'Neighbor', 'Friend', 'Caregiver', 'Other'
  ];

  const handleCall = async (contact: EmergencyContact) => {
    // In a real app, this would initiate a phone call
    const message = `Do you want me to call ${contact.name}? Their number is ${contact.phone}`;
    await MurfService.playText(message, currentLanguage.code);
    
    // Show confirmation dialog
    const confirmed = window.confirm(`Call ${contact.name} at ${contact.phone}?`);
    if (confirmed) {
      // Simulate calling
      window.open(`tel:${contact.phone}`, '_self');
    }
  };

  const handleSMS = async (contact: EmergencyContact) => {
    const message = `Sending emergency message to ${contact.name}`;
    await MurfService.playText(message, currentLanguage.code);
    
  const smsText = 'This is an emergency message from Saanidhya. Please check on me when possible.';
    window.open(`sms:${contact.phone}?body=${encodeURIComponent(smsText)}`, '_self');
  };

  // Simulate call via backend endpoint (no real telephony)
  const simulateCall = async (contact: EmergencyContact) => {
    try {
      const result = await fetch('http://localhost:5000/api/emergency/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, name: contact.name })
      });
      const data = await result.json().catch(() => ({}));
      await MurfService.playText(`Simulated call to ${contact.name} logged.`, currentLanguage.code);
      console.log('Simulate call response', data);
    } catch (err) {
      console.error('Simulate call failed', err);
      await MurfService.playText('Failed to simulate call.', currentLanguage.code);
    }
  };

  const serverCall = async (contact: EmergencyContact) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/emergency/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ contactId: contact.id })
      });
      const data = await res.json().catch(() => ({}));
      await MurfService.playText(data?.message || 'Call request processed.', currentLanguage.code);
    } catch (err) {
      console.error('Server call failed', err);
      await MurfService.playText('Failed to request call.', currentLanguage.code);
    }
  };

  const serverSMS = async (contact: EmergencyContact) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:5000/api/emergency/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify({ contactId: contact.id, message: 'This is an emergency message from Saanidhya.' })
      });
      const data = await res.json().catch(() => ({}));
      await MurfService.playText(data?.message || 'SMS request processed.', currentLanguage.code);
    } catch (err) {
      console.error('Server SMS failed', err);
      await MurfService.playText('Failed to send SMS.', currentLanguage.code);
    }
  };

  const handleEmergencyCall = async () => {
    const primaryContact = contacts.find(c => c.is_primary);
    if (primaryContact) {
      await handleCall(primaryContact);
    } else if (contacts.length > 0) {
      await handleCall(contacts[0]);
    } else {
      await MurfService.playText('No emergency contacts available. Please add a contact first.', currentLanguage.code);
    }
  };

  const handleAddContact = async () => {
    if (newContact.name && newContact.phone) {
      try {
        await ApiService.addEmergencyContact({
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship,
          is_primary: newContact.is_primary
        });
        
        setNewContact({ name: '', phone: '', relationship: '', is_primary: false });
        setShowAddForm(false);
        await loadContacts(); // Reload contacts
      } catch (error) {
        console.error('Failed to add emergency contact:', error);
      }
    }
  };

  const handleEditContact = async () => {
    if (editingContact && newContact.name && newContact.phone) {
      try {
        await ApiService.updateEmergencyContact(editingContact.id, {
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship,
          is_primary: newContact.is_primary
        });
        
        setEditingContact(null);
        setNewContact({ name: '', phone: '', relationship: '', is_primary: false });
        await loadContacts(); // Reload contacts
      } catch (error) {
        console.error('Failed to update emergency contact:', error);
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await ApiService.deleteEmergencyContact(id);
      await loadContacts(); // Reload contacts
    } catch (error) {
      console.error('Failed to delete emergency contact:', error);
    }
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary
    });
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setNewContact({ name: '', phone: '', relationship: '', is_primary: false });
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
            <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
              <Phone className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{t('emergencyCalls')}</h1>
              <p className="text-sm text-gray-600">Safety & connection</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Emergency Call Button */}
          <button
            onClick={handleEmergencyCall}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl text-xl"
          >
            🚨 EMERGENCY CALL
          </button>

          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Emergency Contact</span>
          </button>

          {/* Add/Edit Form Modal */}
          {(showAddForm || editingContact) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </h2>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship
                    </label>
                    <select
                      value={newContact.relationship}
                      onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select relationship</option>
                      {relationships.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Contact */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={newContact.is_primary}
                      onChange={(e) => setNewContact(prev => ({ ...prev, is_primary: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isPrimary" className="text-sm text-gray-700">
                      Set as primary emergency contact
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={editingContact ? cancelEdit : () => setShowAddForm(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingContact ? handleEditContact : handleAddContact}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    {editingContact ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contacts List */}
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-600">No emergency contacts yet</p>
              <p className="text-sm text-gray-500">Add your first contact to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Emergency Contacts</h2>
              {contacts.map(contact => (
                <div key={contact.id} className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Phone className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-800">{contact.name}</h3>
                          {contact.is_primary && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                        <p className="text-xs text-gray-500">{contact.relationship}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCall(contact)}
                        className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                        title="Call"
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => simulateCall(contact)}
                        className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                        title="Simulate Call"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => serverCall(contact)}
                        className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg transition-colors"
                        title="Server Call"
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => handleSMS(contact)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                        title="Send SMS"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => serverSMS(contact)}
                        className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg transition-colors"
                        title="Server SMS"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(contact)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
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

export default EmergencyCalls;