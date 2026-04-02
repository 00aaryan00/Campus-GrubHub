import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../shared/config/firebase";
import { toast } from "react-hot-toast";

const UserNotificationPreferences = () => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    browserNotifications: true,
    toastNotifications: true,
    emailNotifications: true,
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const userPrefDoc = doc(db, "userPreferences", userEmail);
      const docSnap = await getDoc(userPrefDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPreferences({
          browserNotifications: data.browserNotifications !== false,
          toastNotifications: data.toastNotifications !== false,
          emailNotifications: data.emailNotifications !== false,
          email: data.email || userEmail,
        });
      } else {
        setPreferences((prev) => ({
          ...prev,
          email: userEmail,
        }));
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast.error("Error loading notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const userPrefDoc = doc(db, "userPreferences", user.email);

      await setDoc(
        userPrefDoc,
        {
          browserNotifications: preferences.browserNotifications,
          toastNotifications: preferences.toastNotifications,
          emailNotifications: preferences.emailNotifications,
          email: user.email,
          updatedAt: new Date(),
          userName: user.displayName || user.email,
        },
        { merge: true }
      );

      toast.success("Notification preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Error saving preferences");
    } finally {
      setSaving(false);
    }
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
        <p className="text-gray-600 mt-1">Manage how you want to receive updates about your orders</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="browser-notifications"
              type="checkbox"
              checked={preferences.browserNotifications}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  browserNotifications: e.target.checked,
                }))
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="browser-notifications" className="font-medium text-gray-900">
              Browser Notifications
            </label>
            <p className="text-sm text-gray-500">
              Get instant notifications in your browser, even when the page is closed
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="toast-notifications"
              type="checkbox"
              checked={preferences.toastNotifications}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  toastNotifications: e.target.checked,
                }))
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="toast-notifications" className="font-medium text-gray-900">
              Toast Notifications
            </label>
            <p className="text-sm text-gray-500">
              Show popup messages when you're actively using the website
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="email-notifications"
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  emailNotifications: e.target.checked,
                }))
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="email-notifications" className="font-medium text-gray-900">
              Email Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive order summaries and receipts via email ({preferences.email})
            </p>
          </div>
        </div>
      </div>

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
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Privacy & Data Usage</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>Your preferences are used only for order-related notifications.</p>
          <p>You can disable notifications anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default UserNotificationPreferences;
