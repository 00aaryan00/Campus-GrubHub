// utils/notifications.js
export class NotificationManager {
  static async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      
      // Don't use localStorage - store in memory only
      window.notificationPermission = permission;
      
      return permission === 'granted';
    }
    console.log('Notifications not supported in this browser');
    return false;
  }

  static showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const defaultOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        persistent: false,
        vibrate: [100],
        timestamp: Date.now(),
        ...options
      };

      const notification = new Notification(title, defaultOptions);

      // Handle notification clicks
      notification.onclick = function(event) {
        event.preventDefault();
        
        // Focus the window
        if (window.parent) {
          window.parent.focus();
        } else {
          window.focus();
        }

        // Handle custom actions based on tag
        if (options.tag) {
          NotificationManager.handleNotificationClick(options.tag, options);
        }

        // Close notification after click
        notification.close();
      };

      // Auto close after specified time if not set to require interaction
      if (!options.requireInteraction && !options.persistent) {
        setTimeout(() => {
          if (notification) {
            notification.close();
          }
        }, options.autoClose || 8000); // 8 seconds default
      }

      // Handle notification errors
      notification.onerror = function(event) {
        console.error('Notification error:', event);
        // Fallback to toast
        NotificationManager.showToast(title, 'info');
      };

      return notification;
    } else {
      console.log('Notification permission not granted or not supported');
      // Always show toast as fallback
      this.showToast(title, 'info');
      return null;
    }
  }

  static handleNotificationClick(tag, options) {
    // Parse tag to determine action
    if (tag.startsWith('new-dish-')) {
      // Navigate to menu page
      window.location.href = '/menu';
    } else if (tag.startsWith('new-order-')) {
      // Navigate to admin orders page
      window.location.href = '/admin/orders';
    } else if (tag.startsWith('status-')) {
      // Navigate to user orders page
      window.location.href = '/orders';
    } else if (tag.startsWith('pickup-time-')) {
      // Navigate to user orders page
      window.location.href = '/orders';
    } else if (tag.startsWith('notes-')) {
      // Navigate to user orders page
      window.location.href = '/orders';
    }
  }

  static showToast(message, type = 'info', duration = 5000) {
    // Remove any existing toasts of the same type to prevent spam
    const existingToasts = document.querySelectorAll(`.toast-${type}`);
    existingToasts.forEach(toast => {
      if (toast.textContent.includes(message.substring(0, 20))) {
        toast.remove();
      }
    });

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Enhanced styling with better mobile support
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };

    const colorScheme = colors[type] || colors.info;

    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
      animation: slideInToast 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      background: linear-gradient(135deg, ${colorScheme.bg} 0%, ${colorScheme.border} 100%);
      border: 2px solid ${colorScheme.border};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      backdrop-filter: blur(10px);
    `;
    
    // Add icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    const icon = icons[type] || icons.info;
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 16px; flex-shrink: 0;">${icon}</span>
        <span style="flex: 1;">${message}</span>
        <span style="cursor: pointer; font-size: 18px; opacity: 0.7; hover: opacity: 1; margin-left: 8px;" onclick="this.parentElement.parentElement.remove()">×</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add hover effects
    toast.addEventListener('mouseenter', () => {
      toast.style.transform = 'translateY(-2px) scale(1.02)';
      toast.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.25)';
    });

    toast.addEventListener('mouseleave', () => {
      toast.style.transform = 'translateY(0) scale(1)';
      toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    });
    
    // Auto remove after specified duration
    const removeToast = () => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutToast 0.3s ease-in-out forwards';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    };

    setTimeout(removeToast, duration);

    // Remove on click
    toast.onclick = removeToast;

    return toast;
  }

  static showMultipleToasts(messages, type = 'info', delay = 800) {
    messages.forEach((message, index) => {
      setTimeout(() => {
        this.showToast(message, type);
      }, index * delay);
    });
  }

  // Get current user email for targeting notifications
  static getCurrentUserEmail() {
    // Try to get from auth
    const auth = window.firebase?.auth?.();
    if (auth?.currentUser?.email) {
      return auth.currentUser.email;
    }
    
    // Try to get from localStorage or sessionStorage (if you store it)
    const storedUser = window.localStorage?.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData.email;
      } catch (e) {
        console.log('Could not parse stored user data');
      }
    }
    
    // Try to get from global window variable (if you set it)
    if (window.currentUserEmail) {
      return window.currentUserEmail;
    }
    
    return null;
  }

  // Enhanced method: Show order status notification with USER-SPECIFIC targeting
  static showOrderStatusNotification(order, newStatus, isAdmin = false, targetUserEmail = null) {
    // For user notifications, only show if this is for the current user
    if (!isAdmin) {
      const currentUserEmail = this.getCurrentUserEmail();
      const orderUserEmail = targetUserEmail || order.userEmail || order.customerEmail;
      
      // Only show notification if this order belongs to current user
      if (!currentUserEmail || currentUserEmail !== orderUserEmail) {
        console.log('🚫 Notification skipped - not for current user:', {
          currentUser: currentUserEmail,
          orderUser: orderUserEmail
        });
        return;
      }
    }

    const statusConfig = {
      'Accepted': {
        icon: '✅',
        title: isAdmin ? 'Order Accepted' : 'Order Accepted!',
        body: isAdmin 
          ? `${order.itemName} - ${order.userName || order.userEmail || order.customerEmail}`
          : `Your order for ${order.itemName} has been accepted by the cafe.`,
        color: 'success',
        vibrate: [100, 50, 100],
        requireInteraction: false
      },
      'Ready': {
        icon: '🍽️',
        title: isAdmin ? 'Order Ready' : 'Order Ready for Pickup!',
        body: isAdmin 
          ? `${order.itemName} - ${order.userName || order.userEmail || order.customerEmail} is ready`
          : `Your ${order.itemName} is ready! ${order.pickupTime ? `Pickup time: ${order.pickupTime}` : 'Please collect at your convenience.'}`,
        color: 'success',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: !isAdmin
      },
      'Collected': {
        icon: '✨',
        title: isAdmin ? 'Order Collected' : 'Thank You!',
        body: isAdmin 
          ? `${order.itemName} - ${order.userName || order.userEmail || order.customerEmail} collected`
          : `Thank you for collecting your ${order.itemName}! Enjoy your meal!`,
        color: 'info',
        vibrate: [100],
        requireInteraction: false
      },
      'Rejected': {
        icon: '❌',
        title: isAdmin ? 'Order Rejected' : 'Order Update',
        body: isAdmin 
          ? `${order.itemName} - ${order.userName || order.userEmail || order.customerEmail} rejected`
          : `Unfortunately, your order for ${order.itemName} could not be processed. Please contact the cafe for details.`,
        color: 'error',
        vibrate: [200, 100, 200],
        requireInteraction: true
      }
    };

    const config = statusConfig[newStatus];
    if (!config) return;

    console.log('🔔 Showing order status notification:', {
      isAdmin,
      orderId: order.id,
      status: newStatus,
      targetUser: targetUserEmail || order.userEmail || order.customerEmail,
      currentUser: this.getCurrentUserEmail()
    });

    // Show browser notification
    this.showNotification(config.title, {
      body: config.body,
      tag: `order-${order.id}-${newStatus}`,
      requireInteraction: config.requireInteraction,
      persistent: config.requireInteraction,
      vibrate: config.vibrate,
      icon: '/favicon.ico'
    });

    // Also show toast if page is active
    if (document.visibilityState === 'visible') {
      this.showToast(`${config.title}: ${order.itemName}`, config.color, 6000);
    }
  }

  // Enhanced method: Show new dish notification (for ALL users) - This should work for everyone
  static showNewDishNotification(dish, isAdmin = false) {
    const title = '🍽️ New Dish Added!';
    const body = `${dish.name} - ₹${dish.price}\n${dish.veg ? '🥬 Vegetarian' : '🥩 Non-Vegetarian'}`;
    
    console.log('🆕 Showing new dish notification to all users:', dish);
    
    // Show browser notification
    this.showNotification(title, {
      body,
      tag: `new-dish-${dish.id}`,
      requireInteraction: false,
      persistent: false,
      vibrate: [100, 50, 100, 50, 100],
      icon: '/favicon.ico'
    });

    // Also show toast if page is active
    if (document.visibilityState === 'visible') {
      this.showToast(`New dish available: ${dish.name} (₹${dish.price})`, 'success', 6000);
    }
  }

  // Enhanced method: Show new order notification (for ADMINS ONLY)
  static showNewOrderNotification(order, isAdmin = false) {
    // Only show to admins
    if (!isAdmin) {
      console.log('🚫 New order notification skipped - user is not admin');
      return;
    }

    const title = '🔔 New Pre-Order Received!';
    const body = `${order.itemName} - ₹${order.price}\nCustomer: ${order.userName || order.userEmail || order.customerEmail}`;
    
    console.log('📬 Showing new order notification to admin:', order);
    
    // Show browser notification
    this.showNotification(title, {
      body,
      tag: `new-order-${order.id}`,
      requireInteraction: true,
      persistent: true,
      vibrate: [200, 100, 200, 100, 200],
      icon: '/favicon.ico'
    });

    // Also show toast if page is active
    if (document.visibilityState === 'visible') {
      this.showToast(`New order: ${order.itemName} from ${order.userName || order.userEmail || order.customerEmail}`, 'info', 8000);
    }
  }

  // Enhanced method: Show pickup time notification with USER-SPECIFIC targeting
  static showPickupTimeNotification(order, newPickupTime, isAdmin = false, targetUserEmail = null) {
    // For user notifications, only show if this is for the current user
    if (!isAdmin) {
      const currentUserEmail = this.getCurrentUserEmail();
      const orderUserEmail = targetUserEmail || order.userEmail || order.customerEmail;
      
      // Only show notification if this order belongs to current user
      if (!currentUserEmail || currentUserEmail !== orderUserEmail) {
        console.log('🚫 Pickup time notification skipped - not for current user:', {
          currentUser: currentUserEmail,
          orderUser: orderUserEmail
        });
        return;
      }
    }

    const title = isAdmin ? '⏰ Pickup Time Set' : '⏰ Pickup Time Assigned!';
    const body = isAdmin 
      ? `Pickup time set for ${order.itemName}: ${newPickupTime}`
      : `Your ${order.itemName} pickup time: ${newPickupTime}`;
    
    console.log('🕐 Showing pickup time notification:', {
      isAdmin,
      orderId: order.id,
      pickupTime: newPickupTime,
      targetUser: targetUserEmail || order.userEmail || order.customerEmail
    });
    
    // Show browser notification
    this.showNotification(title, {
      body,
      tag: `pickup-time-${order.id}`,
      requireInteraction: !isAdmin,
      persistent: !isAdmin,
      vibrate: [200, 100, 200, 100, 200],
      icon: '/favicon.ico'
    });

    // Also show toast if page is active
    if (document.visibilityState === 'visible') {
      this.showToast(body, 'info', 6000);
    }
  }

  // Method called by AdminOrders for status updates - FIXED WITH USER TARGETING
  static notifyOrderStatusUpdate(orderId, newStatus, orderData) {
    try {
      // Create order object in the format expected by existing methods
      const order = {
        id: orderId,
        itemName: orderData.itemName,
        userName: orderData.customerEmail?.split('@')[0] || 'Customer',
        userEmail: orderData.customerEmail,
        customerEmail: orderData.customerEmail,
        pickupTime: orderData.pickupTime
      };

      // For admin view (always show to admin)
      this.showOrderStatusNotification(order, newStatus, true); // true = isAdmin
      
      // For user view (only show to the specific user)
      this.showOrderStatusNotification(order, newStatus, false, orderData.customerEmail); // false = not admin, with target email
      
      console.log('📧 Customer Status Notification Sent:', {
        orderId,
        newStatus,
        customerEmail: orderData.customerEmail,
        itemName: orderData.itemName
      });

      return true;
    } catch (error) {
      console.error('Error sending status update notification:', error);
      return false;
    }
  }

  // Method called by AdminOrders for pickup time updates - FIXED WITH USER TARGETING
  static notifyPickupTimeSet(orderId, pickupTime, orderData) {
    try {
      // Create order object in the format expected by existing methods
      const order = {
        id: orderId,
        itemName: orderData.itemName,
        userName: orderData.customerEmail?.split('@')[0] || 'Customer',
        userEmail: orderData.customerEmail,
        customerEmail: orderData.customerEmail
      };

      // For admin view (always show to admin)
      this.showPickupTimeNotification(order, pickupTime, true); // true = isAdmin
      
      // For user view (only show to the specific user)
      this.showPickupTimeNotification(order, pickupTime, false, orderData.customerEmail); // false = not admin, with target email
      
      console.log('📧 Pickup Time Notification Sent:', {
        orderId,
        pickupTime,
        customerEmail: orderData.customerEmail,
        itemName: orderData.itemName
      });

      return true;
    } catch (error) {
      console.error('Error sending pickup time notification:', error);
      return false;
    }
  }

  // Method called by AdminOrders for general order updates - FIXED WITH USER TARGETING
  static notifyOrderUpdate(orderId, message, orderData) {
    try {
      // Create order object in the format expected by existing methods
      const order = {
        id: orderId,
        itemName: orderData.itemName,
        userName: orderData.customerEmail?.split('@')[0] || 'Customer',
        userEmail: orderData.customerEmail,
        customerEmail: orderData.customerEmail
      };

      // Use existing method for admin notes
      if (orderData.notes) {
        // For admin view (always show to admin)
        this.showAdminNotesNotification(order, orderData.notes, true); // true = isAdmin
        
        // For user view (only show to the specific user)
        this.showAdminNotesNotification(order, orderData.notes, false, orderData.customerEmail); // false = not admin, with target email
      } else {
        // Generic notification - only show to admin for now
        const currentUserEmail = this.getCurrentUserEmail();
        if (currentUserEmail === orderData.customerEmail || !currentUserEmail) {
          this.showToast(`Order update: ${message} for ${orderData.itemName}`, 'info', 5000);
        }
      }
      
      console.log('📧 Order Update Notification Sent:', {
        orderId,
        message,
        customerEmail: orderData.customerEmail,
        itemName: orderData.itemName,
        notes: orderData.notes
      });

      return true;
    } catch (error) {
      console.error('Error sending order update notification:', error);
      return false;
    }
  }

  // Enhanced method: Show admin notes notification with USER-SPECIFIC targeting
  static showAdminNotesNotification(order, newNotes, isAdmin = false, targetUserEmail = null) {
    // For user notifications, only show if this is for the current user
    if (!isAdmin) {
      const currentUserEmail = this.getCurrentUserEmail();
      const orderUserEmail = targetUserEmail || order.userEmail || order.customerEmail;
      
      // Only show notification if this order belongs to current user
      if (!currentUserEmail || currentUserEmail !== orderUserEmail) {
        console.log('🚫 Admin notes notification skipped - not for current user:', {
          currentUser: currentUserEmail,
          orderUser: orderUserEmail
        });
        return;
      }
    }

    const title = isAdmin ? '📝 Notes Added' : '📝 Message from Cafe';
    const body = isAdmin 
      ? `Notes added for ${order.itemName}`
      : `${order.itemName}: ${newNotes}`;
    
    console.log('📝 Showing admin notes notification:', {
      isAdmin,
      orderId: order.id,
      targetUser: targetUserEmail || order.userEmail || order.customerEmail
    });
    
    // Show browser notification
    this.showNotification(title, {
      body,
      tag: `notes-${order.id}`,
      requireInteraction: !isAdmin,
      persistent: !isAdmin,
      vibrate: [100, 50, 100],
      icon: '/favicon.ico'
    });

    // Also show toast if page is active
    if (document.visibilityState === 'visible') {
      this.showToast(body, 'info', 6000);
    }
  }

  // Utility method to check if notifications are supported and enabled
  static isNotificationSupported() {
    return 'Notification' in window;
  }

  static isNotificationEnabled() {
    return this.isNotificationSupported() && Notification.permission === 'granted';
  }

  // Method to get notification permission status
  static getNotificationPermission() {
    if (!this.isNotificationSupported()) return 'not-supported';
    return Notification.permission;
  }

  // NEW METHOD: Call this when a new dish is added to the menu
  static broadcastNewDish(dish) {
    console.log('🍽️ Broadcasting new dish to all users:', dish);
    
    // This should be called from your menu management component
    // when a new dish is successfully added
    this.showNewDishNotification(dish, false);
    
    // You can also dispatch a custom event for other components to listen
    window.dispatchEvent(new CustomEvent('newDishAdded', { 
      detail: { dish } 
    }));
  }

  // NEW METHOD: Initialize user-specific notification targeting
  static initializeUserNotifications(userEmail) {
    console.log('🎯 Initializing notifications for user:', userEmail);
    
    // Store current user email for targeting
    window.currentUserEmail = userEmail;
    
    // Request notification permission if not already granted
    if (this.getNotificationPermission() === 'default') {
      this.requestPermission();
    }
  }

  // NEW METHOD: Clear user notifications on logout
  static clearUserNotifications() {
    console.log('🧹 Clearing user notification settings');
    window.currentUserEmail = null;
  }
}

// Add CSS animations for toasts
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInToast {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutToast {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    .toast {
      transition: all 0.3s ease;
    }
    
    .toast:hover {
      transform: translateY(-2px) scale(1.02) !important;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
}