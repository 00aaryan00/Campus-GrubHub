import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase';

const UserOrderSummary = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Add this state

  useEffect(() => {
    const auth = getAuth();
    
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // Auth state is now determined
      
      if (currentUser) {
        fetchUserOrders(currentUser.email);
      } else {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const fetchUserOrders = async (userEmail) => {
    try {
      console.log("Fetching orders for email:", userEmail); // Debug log
      
      // Try simple query first
      const q = query(
        collection(db, 'preOrders'),
        where('userEmail', '==', userEmail)
        // Temporarily removed orderBy to test
      );
      const querySnapshot = await getDocs(q);
      const userOrders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Found orders:", userOrders); // Debug log
      setOrders(userOrders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      
      // If orderBy fails, try without it
      try {
        console.log("Retrying without orderBy...");
        const fallbackQuery = query(
          collection(db, 'preOrders'),
          where('userEmail', '==', userEmail)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackOrders = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Fallback orders found:", fallbackOrders);
        setOrders(fallbackOrders);
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'Collected': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-32 bg-gray-300 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  // Show loading while fetching orders
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-32 bg-gray-300 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Required</h3>
          <p className="text-red-600">Please login to view your orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h2>
        <p className="text-gray-600">Track your pre-orders from Aunty's Café</p>
        <p className="text-sm text-gray-500">Welcome, {user.displayName || user.email}!</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Yet</h3>
            <p className="text-gray-500 mb-4">You haven't placed any pre-orders yet.</p>
            <button
              onClick={() => window.location.href = '/menu'} // Adjust route as needed
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Browse Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{order.itemName}</h3>
                    <p className="text-2xl font-bold text-green-600">₹{order.price}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full border ${getStatusColor(order.status)}`}>
                    <span className="text-sm font-medium">
                      {getStatusIcon(order.status)} {order.status}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Status Update:</p>
                  <p className="text-gray-900">{getStatusMessage(order.status)}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1"><strong>Order Placed:</strong></p>
                    <p className="text-gray-900">{formatTime(order.orderTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1"><strong>Pickup Time:</strong></p>
                    {order.pickupTime ? (
                      <p className="text-gray-900 font-medium">🕐 {order.pickupTime}</p>
                    ) : (
                      <p className="text-orange-600">⏱ Admin will assign pickup time soon</p>
                    )}
                  </div>
                </div>

                {order.adminNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-800 mb-2">📝 Admin Notes:</p>
                    <p className="text-blue-900">{order.adminNotes}</p>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Ordered</span>
                    <span>Accepted</span>
                    <span>Ready</span>
                    <span>Collected</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        order.status === 'Rejected' ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{
                        width: order.status === 'Pending' ? '25%' :
                               order.status === 'Accepted' ? '50%' :
                               order.status === 'Ready' ? '75%' :
                               order.status === 'Collected' ? '100%' :
                               order.status === 'Rejected' ? '100%' : '25%'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === 'Ready' && (
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-green-800 font-medium">🎉 Ready for Pickup!</p>
                      <p className="text-green-600 text-sm">Please collect your order</p>
                    </div>
                  )}
                  {order.status === 'Collected' && (
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <p className="text-gray-800 font-medium">✨ Order Completed</p>
                      <p className="text-gray-600 text-sm">Thank you for your order!</p>
                    </div>
                  )}
                  {order.status === 'Rejected' && (
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-red-800 font-medium">❌ Order Rejected</p>
                      <p className="text-red-600 text-sm">Please contact admin for details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOrderSummary;