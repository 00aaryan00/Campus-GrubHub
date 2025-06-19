// hooks/useGlobalNotifications.js
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationManager } from '../utils/notifications';

// Enhanced global notification hook that works for ALL users and in background
export const useGlobalNotifications = (userEmail = null, isAdmin = false) => {
  const isInitialLoad = useRef(true);
  const previousMenuItems = useRef(new Map());
  const previousOrderStates = useRef(new Map());
  const lastOrderCount = useRef(0);

  useEffect(() => {
    // Always setup menu notifications for ALL users (admin and customers)
    let unsubscribeMenu = null;
    let unsubscribeOrders = null;

    const setupGlobalNotifications = async () => {
      try {
        // Request notification permission for ALL users
        const permissionGranted = await NotificationManager.requestPermission();
        if (!permissionGranted) {
          console.warn('Notification permission denied - some features may not work');
          // Still show toast notifications as fallback
        }

        // 1. SETUP MENU NOTIFICATIONS (for ALL users - admin and customers)
        const menuQuery = query(
          collection(db, 'SpecialMenu'),
          orderBy('createdAt', 'desc')
        );

        unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
          if (isInitialLoad.current) {
            // Initialize previous menu items
            snapshot.docs.forEach(doc => {
              const item = { id: doc.id, ...doc.data() };
              previousMenuItems.current.set(item.id, item);
            });
          } else {
            // Check for new menu items - notify ALL users
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const newItem = { id: change.doc.id, ...change.doc.data() };
                
                // Browser notification - works even when page is not focused
                NotificationManager.showNotification(
                  '🍽️ New Dish Available!',
                  {
                    body: `${newItem.name} - ₹${newItem.price}\n${newItem.veg ? '🥬 Vegetarian' : '🥩 Non-Vegetarian'}`,
                    tag: `new-dish-${newItem.id}`,
                    requireInteraction: true, // Keep notification until user clicks
                    icon: '/favicon.ico',
                    persistent: true,
                    vibrate: [200, 100, 200], // Mobile vibration
                    actions: [
                      {
                        action: 'view-menu',
                        title: 'View Menu',
                        icon: '/icons/menu.png'
                      },
                      {
                        action: 'order-now',
                        title: 'Order Now',
                        icon: '/icons/order.png'
                      }
                    ]
                  }
                );

                // Also show toast if page is active
                if (document.visibilityState === 'visible') {
                  NotificationManager.showToast(
                    `🆕 New dish: ${newItem.name} (₹${newItem.price}) - ${newItem.veg ? 'Veg' : 'Non-Veg'}`,
                    'success'
                  );
                }
              }

              // Notify about item updates (price changes, availability)
              if (change.type === 'modified') {
                const updatedItem = { id: change.doc.id, ...change.doc.data() };
                const previousItem = previousMenuItems.current.get(updatedItem.id);
                
                if (previousItem) {
                  // Price change notification
                  if (previousItem.price !== updatedItem.price) {
                    NotificationManager.showNotification(
                      '💰 Price Update',
                      {
                        body: `${updatedItem.name}: ₹${previousItem.price} → ₹${updatedItem.price}`,
                        tag: `price-update-${updatedItem.id}`,
                        requireInteraction: false,
                        icon: '/favicon.ico'
                      }
                    );
                  }

                  // Availability change notification
                  if (previousItem.available !== updatedItem.available) {
                    NotificationManager.showNotification(
                      updatedItem.available ? '✅ Item Available' : '❌ Item Unavailable',
                      {
                        body: `${updatedItem.name} is now ${updatedItem.available ? 'available' : 'unavailable'}`,
                        tag: `availability-${updatedItem.id}`,
                        requireInteraction: false,
                        icon: '/favicon.ico'
                      }
                    );
                  }
                }

                // Update previous item state
                previousMenuItems.current.set(updatedItem.id, updatedItem);
              }
            });
          }
        }, (error) => {
          console.error('Error in menu listener:', error);
        });

        // 2. SETUP ORDER NOTIFICATIONS
        if (userEmail || isAdmin) {
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
          }

          if (ordersQuery) {
            unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
              const currentOrderCount = snapshot.docs.length;

              if (isInitialLoad.current) {
                lastOrderCount.current = currentOrderCount;
                // Initialize previous order states
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

              // Check for new orders (admin only)
              if (isAdmin && currentOrderCount > lastOrderCount.current) {
                const newOrdersCount = currentOrderCount - lastOrderCount.current;
                const newOrders = snapshot.docs.slice(0, newOrdersCount).map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));

                // Show browser notifications for new orders
                newOrders.forEach((order, index) => {
                  setTimeout(() => {
                    NotificationManager.showNotification(
                      '🔔 New Order Received!',
                      {
                        body: `${order.itemName} - ₹${order.price}\nFrom: ${order.userName || order.userEmail}`,
                        tag: `new-order-${order.id}`,
                        requireInteraction: true,
                        icon: '/favicon.ico',
                        persistent: true,
                        vibrate: [200, 100, 200, 100, 200],
                        actions: [
                          {
                            action: 'accept-order',
                            title: 'Accept',
                            icon: '/icons/accept.png'
                          },
                          {
                            action: 'view-order',
                            title: 'View Details',
                            icon: '/icons/view.png'
                          }
                        ]
                      }
                    );
                  }, index * 1000);
                });
              }

              // Check for order updates
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                  const order = { id: change.doc.id, ...change.doc.data() };
                  const previousState = previousOrderStates.current.get(order.id);
                  
                  if (previousState) {
                    // Status change
                    if (previousState.status !== order.status) {
                      handleStatusChangeNotification(order, previousState.status, order.status, isAdmin, userEmail);
                    }

                    // Pickup time change - FIXED LOGIC
                    if (previousState.pickupTime !== order.pickupTime && order.pickupTime) {
                      handlePickupTimeNotification(order, isAdmin, userEmail);
                    }

                    // Admin notes change - FIXED LOGIC
                    if (previousState.adminNotes !== order.adminNotes && order.adminNotes) {
                      handleAdminNotesNotification(order, isAdmin, userEmail);
                    }
                  }

                  // Update previous state
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
            });
          }
        }

      } catch (error) {
        console.error('Error setting up global notifications:', error);
      }
    };

    setupGlobalNotifications();

    // Cleanup
    return () => {
      if (unsubscribeMenu) unsubscribeMenu();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [userEmail, isAdmin]);

  return {
    showNotification: NotificationManager.showNotification,
    showToast: NotificationManager.showToast
  };
};

// FIXED: Enhanced notification handlers with corrected logic
const handleStatusChangeNotification = (order, oldStatus, newStatus, isAdmin, userEmail) => {
  // FIXED: Correct logic - notify if admin OR if it's the user's order
  if (!isAdmin && order.userEmail !== userEmail) return;

  const statusMessages = {
    'Accepted': {
      title: '✅ Order Accepted!',
      body: `Your order for ${order.itemName} has been accepted by the cafe.`,
      adminTitle: '✅ Order Accepted',
      adminBody: `Order ${order.itemName} marked as accepted.`,
      color: 'success',
      vibrate: [100, 50, 100]
    },
    'Ready': {
      title: '🍽️ Order Ready for Pickup!',
      body: `Your ${order.itemName} is ready! ${order.pickupTime ? `Pickup time: ${order.pickupTime}` : 'Please collect at your convenience.'}`,
      adminTitle: '🍽️ Order Ready',
      adminBody: `${order.itemName} marked as ready for pickup.`,
      color: 'success',
      vibrate: [200, 100, 200, 100, 200]
    },
    'Collected': {
      title: '✨ Order Completed',
      body: `Thank you for collecting your ${order.itemName}! Hope you enjoyed it!`,
      adminTitle: '✨ Order Completed',
      adminBody: `${order.itemName} marked as collected.`,
      color: 'info',
      vibrate: [100]
    },
    'Rejected': {
      title: '❌ Order Update',
      body: `Unfortunately, your order for ${order.itemName} could not be processed. Please contact the cafe for details.`,
      adminTitle: '❌ Order Rejected',
      adminBody: `${order.itemName} marked as rejected.`,
      color: 'error',
      vibrate: [200, 100, 200]
    }
  };

  const messageConfig = statusMessages[newStatus];
  if (!messageConfig) return;

  const title = isAdmin ? messageConfig.adminTitle : messageConfig.title;
  const body = isAdmin ? messageConfig.adminBody : messageConfig.body;

  // Browser notification - works even when page is closed
  NotificationManager.showNotification(title, {
    body: body,
    tag: `status-${order.id}-${newStatus}`,
    requireInteraction: newStatus === 'Ready' || newStatus === 'Rejected',
    icon: '/favicon.ico',
    persistent: true,
    vibrate: messageConfig.vibrate,
    actions: !isAdmin && newStatus === 'Ready' ? [
      {
        action: 'view-order',
        title: 'View Order',
        icon: '/icons/view.png'
      },
      {
        action: 'contact-cafe',
        title: 'Contact Cafe',
        icon: '/icons/phone.png'
      }
    ] : undefined
  });

  // Also show toast if page is visible
  if (document.visibilityState === 'visible') {
    const message = isAdmin ? messageConfig.adminBody : `${messageConfig.title}`;
    NotificationManager.showToast(message, messageConfig.color);
  }
};

// FIXED: Pickup time notification with corrected logic
const handlePickupTimeNotification = (order, isAdmin, userEmail) => {
  console.log('🕐 Pickup time notification triggered:', {
    orderId: order.id,
    itemName: order.itemName,
    pickupTime: order.pickupTime,
    orderUserEmail: order.userEmail,
    currentUserEmail: userEmail,
    isAdmin: isAdmin
  });

  // FIXED: Only notify if it's admin OR if it's the user's own order
  if (isAdmin) {
    // Admin notification
    const title = '⏰ Pickup Time Set';
    const body = `Pickup time set for ${order.itemName}: ${order.pickupTime}`;
    
    NotificationManager.showNotification(title, {
      body: body,
      tag: `pickup-time-admin-${order.id}`,
      requireInteraction: false,
      icon: '/favicon.ico',
      vibrate: [100]
    });

    if (document.visibilityState === 'visible') {
      NotificationManager.showToast(`Pickup time set for ${order.itemName}: ${order.pickupTime}`, 'info');
    }
  } else if (order.userEmail === userEmail) {
    // Customer notification - FIXED: This should now work!
    const title = '⏰ Pickup Time Assigned!';
    const body = `Your ${order.itemName} pickup time: ${order.pickupTime}`;

    console.log('🔔 Sending pickup time notification to customer:', title, body);

    NotificationManager.showNotification(title, {
      body: body,
      tag: `pickup-time-customer-${order.id}`,
      requireInteraction: true,
      icon: '/favicon.ico',
      persistent: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        {
          action: 'set-reminder',
          title: 'Set Reminder',
          icon: '/icons/reminder.png'
        },
        {
          action: 'view-order',
          title: 'View Order',
          icon: '/icons/view.png'
        }
      ]
    });

    if (document.visibilityState === 'visible') {
      NotificationManager.showToast(`⏰ Pickup time: ${order.pickupTime} for ${order.itemName}`, 'info');
    }
  }
};

// FIXED: Admin notes notification with corrected logic
const handleAdminNotesNotification = (order, isAdmin, userEmail) => {
  console.log('📝 Admin notes notification triggered:', {
    orderId: order.id,
    itemName: order.itemName,
    adminNotes: order.adminNotes,
    orderUserEmail: order.userEmail,
    currentUserEmail: userEmail,
    isAdmin: isAdmin
  });

  // FIXED: Only notify customers about their own orders (not admin)
  if (!isAdmin && order.userEmail === userEmail) {
    const title = '📝 Message from Cafe';
    const body = `${order.itemName}: ${order.adminNotes}`;

    console.log('🔔 Sending admin notes notification to customer:', title, body);

    // Browser notification
    NotificationManager.showNotification(title, {
      body: body,
      tag: `notes-${order.id}`,
      requireInteraction: true,
      icon: '/favicon.ico',
      persistent: true,
      vibrate: [100, 50, 100, 50, 100],
      actions: [
        {
          action: 'view-order',
          title: 'View Order',
          icon: '/icons/view.png'
        },
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply.png'
        }
      ]
    });

    if (document.visibilityState === 'visible') {
      NotificationManager.showToast(`📝 New message about your ${order.itemName}`, 'info');
    }
  }
};