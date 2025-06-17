// utils/notifications.js
export class NotificationManager {
  static async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission === 'granted';
    }
    console.log('Notifications not supported in this browser');
    return false;
  }

  static showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico', // You can replace with your cafe icon
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options
      });

      // Auto close after 5 seconds if not set to require interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } else {
      console.log('Notification permission not granted or not supported');
      // Fallback to toast notification
      this.showToast(title, 'info');
    }
  }

  static showToast(message, type = 'info') {
    // Remove any existing toasts of the same type to prevent spam
    const existingToasts = document.querySelectorAll(`.toast-${type}`);
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Enhanced styling
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };

    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      min-width: 250px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.2s ease, opacity 0.3s ease;
      animation: slideIn 0.3s ease-out;
      background-color: ${colors[type] || colors.info};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      float: right;
      margin-left: 10px;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
    `;
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);

    // Remove on click
    toast.onclick = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    };
  }

  static showMultipleToasts(messages, type = 'info', delay = 500) {
    messages.forEach((message, index) => {
      setTimeout(() => {
        this.showToast(message, type);
      }, index * delay);
    });
  }
}

// Add required CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast:hover {
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}