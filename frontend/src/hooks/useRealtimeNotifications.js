// hooks/useRealtimeNotifications.js
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path to your firebase config
import { NotificationManager } from '../utils/notifications';

export const useRealtimeNotifications = (
  enableOrderNotifications = true,
  userEmail = null, // Pass customer email to filter their orders
  isAdmin = false // Pass true for admin, false for customer
) => {
  const isInitialLoad = useRef(true);
  const lastOrderCount = useRef(0);
  const previousOrderStates = useRef(new Map()); // Track previous states

  useEffect(() => {
    if (!enableOrderNotifications) return;

    // Reset refs when user changes
    isInitialLoad.current = true;
    lastOrderCount.current = 0;
    previousOrderStates.current = new Map();

    let unsubscribeOrders = null;

    const setupOrderNotifications = async () => {
      try {
        // Request notification permission
        await NotificationManager.requestPermission();

        // Create query based on user type
        let ordersQuery;
        if (isAdmin) {
          // Admin sees all orders
          ordersQuery = query(
            collection(db, 'preOrders'),
            orderBy('orderTime', 'desc')
          );
        } else if (userEmail) {
          // Customer sees only their orders
          ordersQuery = query(
            collection(db, 'preOrders'),
            where('userEmail', '==', userEmail),
            orderBy('orderTime', 'desc')
          );
        } else {
          console.warn('No userEmail provided for customer notifications');
          return;
        }

        unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const currentOrderCount = snapshot.docs.length;

          // Skip notifications on initial load
          if (isInitialLoad.current) {
            lastOrderCount.current = currentOrderCount;
            // Initialize previous states
            snapshot.docs.forEach(doc => {
              const order = { id: doc.id, ...doc.data() };
              previousOrderStates.current.set(order.id, {
                status: order.status,
                pickupTime: order.pickupTime,
                adminNotes: order.adminNotes
              });
            });
            isInitialLoad.current = false;
            return;
          }

          // For admin: Check for new orders
          if (isAdmin && currentOrderCount > lastOrderCount.current) {
            const newOrdersCount = currentOrderCount - lastOrderCount.current;
            
            // Get the newest orders
            const newOrders = snapshot.docs.slice(0, newOrdersCount).map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Show notifications for new orders
            newOrders.forEach((order, index) => {
              setTimeout(() => {
                NotificationManager.showNotification(
                  '🔔 New Pre-Order Received!',
                  {
                    body: `${order.itemName} - ₹${order.price}\nCustomer: ${order.userName || order.userEmail}`,
                    tag: `new-order-${order.id}`,
                    requireInteraction: true,
                    icon: '/favicon.ico'
                  }
                );

                NotificationManager.showToast(
                  `New order: ${order.itemName} from ${order.userName || 'Customer'}`,
                  'success'
                );
              }, index * 1000); // Stagger notifications
            });
          }

          // Check for status and field changes in existing orders
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified' && !isInitialLoad.current) {
              const order = { id: change.doc.id, ...change.doc.data() };
              const previousState = previousOrderStates.current.get(order.id);
              
              if (previousState) {
                // Check for status change
                if (previousState.status !== order.status) {
                  handleStatusChange(order, previousState.status, order.status, isAdmin);
                }

                // Check for pickup time change
                if (previousState.pickupTime !== order.pickupTime && order.pickupTime) {
                  handlePickupTimeChange(order, isAdmin);
                }

                // Check for admin notes change
                if (previousState.adminNotes !== order.adminNotes && order.adminNotes) {
                  handleAdminNotesChange(order, isAdmin);
                }
              }

              // Update the previous state
              previousOrderStates.current.set(order.id, {
                status: order.status,
                pickupTime: order.pickupTime,
                adminNotes: order.adminNotes
              });
            }
          });

          lastOrderCount.current = currentOrderCount;
        }, (error) => {
          console.error('Error in orders listener:', error);
          NotificationManager.showToast('Error connecting to real-time updates', 'error');
        });

      } catch (error) {
        console.error('Error setting up notifications:', error);
        NotificationManager.showToast('Error setting up notifications', 'error');
      }
    };

    setupOrderNotifications();

    // Cleanup function
    return () => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, [enableOrderNotifications, userEmail, isAdmin]); // Added userEmail to dependencies

  // Return methods that components can use
  return {
    showNotification: NotificationManager.showNotification,
    showToast: NotificationManager.showToast,
    requestPermission: NotificationManager.requestPermission
  };
};

// Handle status change notifications
const handleStatusChange = (order, oldStatus, newStatus, isAdmin) => {
  const statusMessages = {
    'Accepted': {
      title: '✅ Order Accepted!',
      body: `Your order for ${order.itemName} has been accepted by the cafe.`,
      adminTitle: '✅ Order Accepted',
      adminBody: `Order ${order.itemName} marked as accepted.`,
      color: 'success'
    },
    'Ready': {
      title: '🍽️ Order Ready for Pickup!',
      body: `Your ${order.itemName} is ready! ${order.pickupTime ? `Pickup time: ${order.pickupTime}` : 'Please collect at your convenience.'}`,
      adminTitle: '🍽️ Order Ready',
      adminBody: `${order.itemName} marked as ready for pickup.`,
      color: 'success'
    },
    'Collected': {
      title: '✨ Order Completed',
      body: `Thank you for collecting your ${order.itemName}! Enjoy your meal!`,
      adminTitle: '✨ Order Completed',
      adminBody: `${order.itemName} marked as collected.`,
      color: 'info'
    },
    'Rejected': {
      title: '❌ Order Update',
      body: `Unfortunately, your order for ${order.itemName} could not be processed. Please contact the cafe for details.`,
      adminTitle: '❌ Order Rejected',
      adminBody: `${order.itemName} marked as rejected.`,
      color: 'error'
    }
  };

  const messageConfig = statusMessages[newStatus];
  if (!messageConfig) return;

  if (isAdmin) {
    // Admin notification
    NotificationManager.showToast(messageConfig.adminBody, messageConfig.color);
  } else {
    // Customer notification
    NotificationManager.showNotification(messageConfig.title, {
      body: messageConfig.body,
      tag: `status-${order.id}-${newStatus}`,
      requireInteraction: newStatus === 'Ready', // Require interaction for ready orders
      icon: '/favicon.ico'
    });

    NotificationManager.showToast(
      `${messageConfig.title}: ${order.itemName}`,
      messageConfig.color
    );
  }
};

// Handle pickup time assignment notifications
const handlePickupTimeChange = (order, isAdmin) => {
  if (isAdmin) {
    NotificationManager.showToast(
      `Pickup time set for ${order.itemName}: ${order.pickupTime}`,
      'info'
    );
  } else {
    NotificationManager.showNotification(
      '⏰ Pickup Time Assigned!',
      {
        body: `Your ${order.itemName} pickup time: ${order.pickupTime}`,
        tag: `pickup-time-${order.id}`,
        requireInteraction: true,
        icon: '/favicon.ico'
      }
    );

    NotificationManager.showToast(
      `Pickup time assigned: ${order.pickupTime} for ${order.itemName}`,
      'info'
    );
  }
};

// Handle admin notes notifications
const handleAdminNotesChange = (order, isAdmin) => {
  if (isAdmin) {
    NotificationManager.showToast(
      `Notes added for ${order.itemName}`,
      'info'
    );
  } else {
    NotificationManager.showNotification(
      '📝 Message from Cafe',
      {
        body: `${order.itemName}: ${order.adminNotes}`,
        tag: `notes-${order.id}`,
        requireInteraction: true,
        icon: '/favicon.ico'
      }
    );

    NotificationManager.showToast(
      `New message about your ${order.itemName}`,
      'info'
    );
  }
};

// Alternative hook for menu changes (if you want to track menu updates in real-time)
export const useMenuNotifications = () => {
  const isInitialLoad = useRef(true);

  useEffect(() => {
    console.log('Menu notifications hook initialized');
    // You could implement Firebase listener for menu collection here
    // Similar to the orders listener above
  }, []);

  return {
    notifyNewDish: (dishName, price, isVeg) => {
      NotificationManager.showNotification(
        `🍽️ New Dish Added: ${dishName}`,
        {
          body: `Price: ₹${price} | ${isVeg ? 'Vegetarian' : 'Non-Vegetarian'}`,
          tag: `new-dish-${dishName}`,
          requireInteraction: false
        }
      );

      NotificationManager.showToast(
        `New dish added: ${dishName} (₹${price})`,
        'success'
      );
    },

    notifyMenuUpdate: (updatedCount) => {
      NotificationManager.showToast(
        `Menu updated successfully! ${updatedCount} items saved.`,
        'success'
      );
    }
  };
};