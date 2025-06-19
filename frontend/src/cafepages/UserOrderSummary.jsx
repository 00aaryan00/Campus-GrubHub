import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase';
import { NotificationManager } from '../utils/notifications';
import { useGlobalNotifications } from '../hooks/useGlobalNotifications';
import './UserOrderSummary.css';

const UserOrderSummary = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Initialize global notifications for this user
  const { showNotification, showToast } = useGlobalNotifications(user?.email, false);

  // Check notification permission status
  useEffect(() => {
    const checkPermission = () => {
      const permission = NotificationManager.getNotificationPermission();
      setNotificationPermission(permission);
    };

    checkPermission();
    // Check permission changes
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchUserOrders = useCallback(async (userEmail) => {
    try {
      const q = query(
        collection(db, 'preOrders'),
        where('userEmail', '==', userEmail),
        orderBy('orderTime', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const userOrders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(userOrders);
    } catch (error) {
      console.error('Error fetching orders with orderBy:', error);
      try {
        // Fallback query without orderBy
        const fallbackQuery = query(
          collection(db, 'preOrders'),
          where('userEmail', '==', userEmail)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackOrders = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(fallbackOrders);
      } catch (fallbackError) {
        console.error('Error fetching orders (fallback):', fallbackError);
        NotificationManager.showToast("Error loading orders", "error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Authentication listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Initialize user-specific notifications
        NotificationManager.initializeUserNotifications(currentUser.email);
        fetchUserOrders(currentUser.email);
      } else {
        // Clear notifications on logout
        NotificationManager.clearUserNotifications();
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserOrders]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    const granted = await NotificationManager.requestPermission();
    if (granted) {
      setNotificationPermission('granted');
      NotificationManager.showToast('✅ Notifications enabled! You\'ll receive updates about your orders.', 'success');
    } else {
      setNotificationPermission('denied');
      NotificationManager.showToast('❌ Notifications disabled. You can enable them in browser settings.', 'warning');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Accepted': return '✅';
      case 'Ready': return '🎉';
      case 'Collected': return '✨';
      case 'Rejected': return '❌';
      default: return '📋';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'Pending': return 'Your order is being reviewed by admin';
      case 'Accepted': return 'Order confirmed! Preparing your item';
      case 'Ready': return 'Your order is ready for pickup!';
      case 'Collected': return 'Order completed. Thank you!';
      case 'Rejected': return 'Order was rejected. Please contact admin';
      default: return 'Order status unknown';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getProgressWidth = (status) => {
    switch (status) {
      case 'Pending': return '25%';
      case 'Accepted': return '50%';
      case 'Ready': return '75%';
      case 'Collected':
      case 'Rejected': return '100%';
      default: return '25%';
    }
  };

  // Manual refresh with loading state
  const handleRefresh = async () => {
    if (user?.email && !loading) {
      setLoading(true);
      await fetchUserOrders(user.email);
    }
  };

  // Render notification permission banner
  const renderNotificationBanner = () => {
    if (notificationPermission === 'granted') {
      return (
        <div className="notification-banner notification-enabled">
          <div className="notification-banner-content">
            <span className="notification-icon">🔔</span>
            <div className="notification-text">
              <strong>Notifications Enabled</strong>
              <p>You'll receive real-time updates about your orders, even when this page is closed.</p>
            </div>
          </div>
        </div>
      );
    }

    if (notificationPermission === 'denied') {
      return (
        <div className="notification-banner notification-disabled">
          <div className="notification-banner-content">
            <span className="notification-icon">🔕</span>
            <div className="notification-text">
              <strong>Notifications Disabled</strong>
              <p>Enable notifications in your browser settings to receive order updates.</p>
            </div>
          </div>
        </div>
      );
    }

    if (notificationPermission === 'default') {
      return (
        <div className="notification-banner notification-request">
          <div className="notification-banner-content">
            <span className="notification-icon">🔔</span>
            <div className="notification-text">
              <strong>Enable Notifications</strong>
              <p>Get instant updates about your orders, even when this website is closed.</p>
            </div>
            <button 
              onClick={requestNotificationPermission}
              className="notification-enable-btn"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="orders-container">
        <div className="orders-loading">
          <div className="orders-loading-spinner"></div>
          <div className="orders-loading-text">Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-container">
        <div className="orders-loading">
          <div className="orders-loading-spinner"></div>
          <div className="orders-loading-text">Loading your orders...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="orders-container">
        <div className="auth-error">
          <div className="auth-error-container">
            <h3 className="auth-error-title">Authentication Required</h3>
            <p className="auth-error-text">Please login to view your orders.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="max-w-4xl mx-auto px-4">
        <div className="orders-header">
          <h2 className="orders-title">My Orders</h2>
          <p className="orders-subtitle">Track your pre-orders from Aunty's Café</p>
          <p className="orders-user-info">Welcome, {user.displayName || user.email}!</p>
          
          <div className="orders-header-actions">
            <button 
              onClick={handleRefresh}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {renderNotificationBanner()}

        {orders.length === 0 ? (
          <div className="empty-orders-state">
            <div className="empty-orders-container">
              <div className="empty-orders-icon">🍽️</div>
              <h3 className="empty-orders-title">No Orders Yet</h3>
              <p className="empty-orders-subtitle">You haven't placed any pre-orders yet.</p>
              <button
                onClick={() => window.location.href = '/menu'}
                className="browse-menu-btn"
              >
                Browse Menu
              </button>
            </div>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-item-info">
                    <h3>{order.itemName}</h3>
                    <div className="order-price">₹{order.price}</div>
                  </div>
                  <div className={`status-badge status-${order.status.toLowerCase()}`}>
                    <span>{getStatusIcon(order.status)} {order.status}</span>
                  </div>
                </div>

                <div className="status-message">
                  <div className="status-message-label">Status Update:</div>
                  <div className="status-message-text">{getStatusMessage(order.status)}</div>
                </div>

                <div className="order-details-grid">
                  <div className="order-detail-item">
                    <div className="order-detail-label">Order Placed:</div>
                    <div className="order-detail-value">{formatTime(order.orderTime)}</div>
                  </div>
                  <div className="order-detail-item">
                    <div className="order-detail-label">Pickup Time:</div>
                    {order.pickupTime ? (
                      <div className="order-detail-value pickup-time-assigned">
                        🕐 {order.pickupTime}
                      </div>
                    ) : (
                      <div className="order-detail-value pickup-time-pending">
                        ⏱ Admin will assign pickup time soon
                      </div>
                    )}
                  </div>
                </div>

                {order.adminNotes && (
                  <div className="admin-notes">
                    <div className="admin-notes-label">
                      📝 Admin Notes:
                    </div>
                    <div className="admin-notes-text">{order.adminNotes}</div>
                  </div>
                )}

                <div className="progress-container">
                  <div className="progress-labels">
                    <span>Ordered</span>
                    <span>Accepted</span>
                    <span>Ready</span>
                    <span>Collected</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${order.status === 'Rejected' ? 'progress-rejected' : 'progress-normal'}`}
                      style={{
                        width: getProgressWidth(order.status)
                      }}
                    ></div>
                  </div>
                </div>

                {order.status === 'Ready' && (
                  <div className="order-action-section action-ready">
                    <div className="action-title">🎉 Ready for Pickup!</div>
                    <div className="action-subtitle">Please collect your order</div>
                  </div>
                )}
                
                {order.status === 'Collected' && (
                  <div className="order-action-section action-completed">
                    <div className="action-title">✨ Order Completed</div>
                    <div className="action-subtitle">Thank you for your order!</div>
                  </div>
                )}
                
                {order.status === 'Rejected' && (
                  <div className="order-action-section action-rejected">
                    <div className="action-title">❌ Order Rejected</div>
                    <div className="action-subtitle">Please contact admin for details</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOrderSummary;