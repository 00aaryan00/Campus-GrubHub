// components/AppWrapper.js
import React, { useEffect, useState } from 'react';
import { useGlobalNotifications } from '../hooks/useGlobalNotifications';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AppWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is admin (you can modify this logic based on your app)
  const checkAdminStatus = (userEmail) => {
    // Add your admin email(s) here
    const adminEmails = ['admin@cafe.com', 'owner@cafe.com']; // Replace with actual admin emails
    return adminEmails.includes(userEmail);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAdmin(checkAdminStatus(currentUser.email));
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize global notifications for ALL users
  useGlobalNotifications(user?.email, isAdmin);

  // Handle notification actions
  useEffect(() => {
    const handleNotificationAction = (event) => {
      const { action, notification } = event;
      
      switch (action) {
        case 'view-menu':
          window.focus();
          window.location.href = '/menu';
          break;
        case 'order-now':
          window.focus();
          window.location.href = '/order';
          break;
        case 'view-order':
          window.focus();
          window.location.href = '/orders';
          break;
        case 'accept-order':
          window.focus();
          window.location.href = '/admin/orders';
          break;
        case 'contact-cafe':
          window.focus();
          // Open contact modal or page
          break;
        case 'set-reminder':
          // Set a browser reminder
          if ('permissions' in navigator && 'request' in navigator.permissions) {
            // Could implement reminder functionality
          }
          break;
        default:
          window.focus();
      }
      
      notification.close();
    };

    // Listen for notification actions
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.addEventListener('notificationclick', handleNotificationAction);
      
      return () => {
        navigator.serviceWorker.removeEventListener('notificationclick', handleNotificationAction);
      };
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Notification permission banner for users who haven't granted permission */}
      <NotificationBanner />
      {children}
    </div>
  );
};

// Component to show notification permission banner
const NotificationBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner if notifications are not granted
    if ('Notification' in window && Notification.permission === 'default') {
      setShowBanner(true);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowBanner(false);
        // Show success notification
        new Notification('🔔 Notifications Enabled!', {
          body: 'You\'ll now receive updates about new dishes and order status',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-3 text-center relative">
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm">
          🔔 Enable notifications to get updates about new dishes and your orders!
        </span>
        <button
          onClick={requestPermission}
          className="bg-white text-blue-600 px-4 py-1 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Enable Notifications
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-white hover:text-gray-200 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AppWrapper;