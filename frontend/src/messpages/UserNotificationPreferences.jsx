import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { WhatsAppService } from '../utils/whatsappService';

const UserNotificationPreferences = () => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    browserNotifications: true,
    toastNotifications: true,
    whatsappNotifications: false,
    emailNotifications: true,
    phoneNumber: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  const whatsappService = new WhatsAppService();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadUserPreferences(currentUser.email);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserPreferences = async (userEmail) => {
    try {
      const userPrefDoc = doc(db, 'userPreferences', userEmail);
      const docSnap = await getDoc(userPrefDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPreferences({
          browserNotifications: data.browserNotifications !== false,
          toastNotifications: data.toastNotifications !== false,
          whatsappNotifications: data.whatsappNotifications === true,
          emailNotifications: data.emailNotifications !== false,
          phoneNumber: data.phoneNumber || '',
          email: data.email || userEmail
        });
      } else {
        // Set default preferences
        setPreferences(prev => ({
          ...prev,
          email: userEmail
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Error loading notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const userPrefDoc = doc(db, 'userPreferences', user.email);
      
      // Validate phone number if WhatsApp is enabled
      if (preferences.whatsappNotifications && !preferences.phoneNumber) {
        toast.error('Please provide a phone number for WhatsApp notifications');
        setSaving(false);
        return;
      }

      await setDoc(userPrefDoc, {
        ...preferences,
        email: user.email,
        updatedAt: new Date(),
        userName: user.displayName || user.email
      }, { merge: true });

      toast.success('Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppNotification = async () => {
    if (!preferences.phoneNumber) {
      toast.error('Please enter a phone number first');
      return;
    }

    setTestingWhatsApp(true);
    try {
      const success = await whatsappService.testConnection(preferences.phoneNumber);
      if (success) {
        toast.success('Test WhatsApp message sent! Check your phone.');
      } else {
        toast.error('Failed to send test message. Please check your phone number.');
      }
    } catch (error) {
      console.error('Error testing WhatsApp:', error);
      toast.error('Error testing WhatsApp connection');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as +91 XXXXX XXXXX for Indian numbers
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
    } else if (cleaned.length <= 12) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{0,5})/, '+$1 $2 $3').trim();
    }
    
    return cleaned;
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPreferences(prev => ({
      ...prev,
      phoneNumber: formatted
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading preferences...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Please login to manage notification preferences.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
        <p className="text-gray-600 mt-1">
          Manage how you want to receive updates about your orders
        </p>
      </div>

      <div className="space-y-6">
        {/* Browser Notifications */}
        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="browser-notifications"
              type="checkbox"
              checked={preferences.browserNotifications}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                browserNotifications: e.target.checked
              }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="browser-notifications" className="font-medium text-gray-900">
              🔔 Browser Notifications
            </label>
            <p className="text-sm text-gray-500">
              Get instant notifications in your browser, even when the page is closed
            </p>
          </div>
        </div>

        {/* Toast Notifications */}
        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="toast-notifications"
              type="checkbox"
              checked={preferences.toastNotifications}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                toastNotifications: e.target.checked
              }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="toast-notifications" className="font-medium text-gray-900">
              💬 Toast Notifications
            </label>
            <p className="text-sm text-gray-500">
              Show popup messages when you're actively using the website
            </p>
          </div>
        </div>

        {/* WhatsApp Notifications */}
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-start space-x-3 mb-3">
            <div className="flex items-center h-5">
              <input
                id="whatsapp-notifications"
                type="checkbox"
                checked={preferences.whatsappNotifications}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  whatsappNotifications: e.target.checked
                }))}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="whatsapp-notifications" className="font-medium text-gray-900">
                📱 WhatsApp Notifications <span className="text-green-600 text-sm font-normal">(New!)</span>
              </label>
              <p className="text-sm text-gray-600">
                Receive order updates directly on WhatsApp - never miss an update!
              </p>
            </div>
          </div>

          {preferences.whatsappNotifications && (
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Phone Number *
                </label>
                <div className="flex space-x-2">
                  <input
                    id="phone-number"
                    type="tel"
                    placeholder="Enter your phone number (e.g., 98765 43210)"
                    value={preferences.phoneNumber}
                    onChange={handlePhoneNumberChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={testWhatsAppNotification}
                    disabled={testingWhatsApp || !preferences.phoneNumber}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {testingWhatsApp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <span>🧪</span>
                        <span>Test</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Include country code for international numbers (e.g., +91 for India)
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">What you'll receive on WhatsApp:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✅ Order acceptance confirmation</li>
                  <li>⏰ Pickup time notifications</li>
                  <li>🍽️ Order ready alerts</li>
                  <li>📝 Messages from cafe staff</li>
                  <li>🆕 New menu item announcements</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Email Notifications */}
        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="email-notifications"
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                emailNotifications: e.target.checked
              }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="email-notifications" className="font-medium text-gray-900">
              📧 Email Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive order summaries and receipts via email ({preferences.email})
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end space-x-3">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📋 Privacy & Data Usage</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Your phone number is used only for order notifications</p>
          <p>• We never share your contact information with third parties</p>
          <p>• You can disable notifications anytime</p>
          <p>• All notifications are secure and encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default UserNotificationPreferences;