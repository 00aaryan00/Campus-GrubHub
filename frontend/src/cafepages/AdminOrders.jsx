import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { NotificationManager } from '../utils/notifications';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [editingPickupTime, setEditingPickupTime] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'preOrders'), orderBy("orderTime", "desc"));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(items);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error fetching orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        status: newStatus,
        statusUpdatedAt: new Date()
      });
      
      const order = orders.find(o => o.id === orderId);
      toast.success(
        `Order ${order?.itemName} marked as ${newStatus}`,
        { duration: 3000 }
      );
      
      NotificationManager.notifyOrderStatusUpdate(orderId, newStatus, {
        itemName: order?.itemName,
        customerEmail: order?.userEmail,
        pickupTime: order?.pickupTime
      });
      
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating order status");
    }
  };

  const updatePickupTime = async (orderId) => {
    const newTime = editingPickupTime[orderId];
    if (!newTime) return;

    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        pickupTime: newTime,
        pickupTimeSetAt: new Date()
      });
      
      const order = orders.find(o => o.id === orderId);
      toast.success(
        `Pickup time set for ${order?.itemName}: ${newTime}`,
        { duration: 4000 }
      );
      
      NotificationManager.notifyPickupTimeSet(orderId, newTime, {
        itemName: order?.itemName,
        customerEmail: order?.userEmail
      });
      
      setEditingPickupTime(prev => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (error) {
      console.error("Error updating pickup time:", error);
      toast.error("Error updating pickup time");
    }
  };

  const updateAdminNotes = async (orderId) => {
    const notes = editingNotes[orderId];
    
    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        adminNotes: notes || '',
        notesUpdatedAt: new Date()
      });
      
      const order = orders.find(o => o.id === orderId);
      toast.success(
        `Notes ${notes ? 'updated' : 'cleared'} for ${order?.itemName}`,
        { duration: 3000 }
      );
      
      if (notes && notes.length > 0) {
        NotificationManager.notifyOrderUpdate(orderId, 'Admin added notes to your order', {
          itemName: order?.itemName,
          customerEmail: order?.userEmail,
          notes: notes
        });
      }
      
      setEditingNotes(prev => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Error updating admin notes");
    }
  };

  const quickUpdateStatus = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (newStatus === 'Rejected') {
      const confirmed = window.confirm(
        `Are you sure you want to reject the order for ${order.itemName}? This will notify the customer.`
      );
      if (!confirmed) return;
    }

    if (newStatus === 'Ready' && !order.pickupTime) {
      const shouldSetTime = window.confirm(
        `This order doesn't have a pickup time set. Would you like to set one now? (Recommended for better customer experience)`
      );
      if (shouldSetTime) {
        setEditingPickupTime(prev => ({ ...prev, [orderId]: '' }));
        toast.warning("Please set a pickup time below before marking as ready", { duration: 5000 });
        return;
      }
    }

    await updateStatus(orderId, newStatus);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Accepted': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Ready': return 'bg-green-50 text-green-800 border-green-200';
      case 'Collected': return 'bg-stone-50 text-stone-800 border-stone-200';
      case 'Rejected': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Accepted': return '☕';
      case 'Ready': return '🫖';
      case 'Collected': return '✨';
      case 'Rejected': return '❌';
      default: return '📋';
    }
  };

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #f5f1eb 0%, #e8ddd4 100%)',
        fontFamily: 'Georgia, serif'
      }}
    >
      {/* Coffee Pattern Background */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D2B48C' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 to-yellow-700 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">☕ Café Orders</h1>
              <p className="text-amber-100 text-lg">Brewing happiness, one order at a time</p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm font-medium">🔔 Live Updates</p>
                <p className="text-xs text-amber-100">Active</p>
              </div>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">☕</div>
            <p className="text-2xl text-amber-800 font-semibold mb-2">No orders brewing yet</p>
            <p className="text-amber-600">New orders will appear here like magic</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div 
                key={order.id} 
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full flex items-center justify-center text-2xl">
                        ☕
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-amber-900">{order.itemName}</h3>
                        <p className="text-xl text-amber-700 font-semibold">₹{order.price}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)} {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Time Info */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-sm text-amber-700 font-semibold mb-2">👤 Customer</p>
                      <p className="text-amber-900 font-medium">{order.userName || order.userEmail}</p>
                      {order.userName && (
                        <p className="text-sm text-amber-600">{order.userEmail}</p>
                      )}
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-sm text-amber-700 font-semibold mb-2">🕐 Ordered</p>
                      <p className="text-amber-900 font-medium">{formatTime(order.orderTime)}</p>
                    </div>
                  </div>

                  {/* Quick Actions for Pending Orders */}
                  {order.status === 'Pending' && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">⚡</span>
                        <p className="font-bold text-amber-800">Quick Actions</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => quickUpdateStatus(order.id, 'Accepted')}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          ☕ Accept & Start Brewing
                        </button>
                        <button
                          onClick={() => quickUpdateStatus(order.id, 'Rejected')}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          ❌ Sorry, Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pickup Time Section */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">⏰</span>
                      <p className="font-bold text-blue-800">Pickup Time</p>
                    </div>
                    {order.pickupTime ? (
                      <div className="flex items-center gap-3">
                        <span className="text-green-700 font-bold text-lg">✓ {order.pickupTime}</span>
                        <button
                          onClick={() => setEditingPickupTime(prev => ({ 
                            ...prev, 
                            [order.id]: prev[order.id] || order.pickupTime 
                          }))}
                          className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Change Time
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPickupTime(prev => ({ ...prev, [order.id]: '' }))}
                        className="text-orange-700 font-bold hover:text-orange-800 underline cursor-pointer"
                      >
                        ⏱ Set pickup time for customer
                      </button>
                    )}
                    
                    {editingPickupTime[order.id] !== undefined && (
                      <div className="mt-4 p-4 bg-white border-2 border-blue-300 rounded-lg">
                        <p className="font-bold text-blue-800 mb-3">🕐 When will it be ready?</p>
                        <div className="flex gap-3 flex-wrap">
                          <select
                            value={editingPickupTime[order.id]}
                            onChange={(e) => setEditingPickupTime(prev => ({ 
                              ...prev, 
                              [order.id]: e.target.value 
                            }))}
                            className="border-2 border-blue-300 rounded-lg px-4 py-2 font-medium min-w-[140px] focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Select Time</option>
                            <option value="2:00 PM">2:00 PM</option>
                            <option value="2:30 PM">2:30 PM</option>
                            <option value="3:00 PM">3:00 PM</option>
                            <option value="3:30 PM">3:30 PM</option>
                            <option value="4:00 PM">4:00 PM</option>
                            <option value="4:30 PM">4:30 PM</option>
                            <option value="5:00 PM">5:00 PM</option>
                          </select>
                          <button
                            onClick={() => updatePickupTime(order.id)}
                            disabled={!editingPickupTime[order.id]}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
                          >
                            ✓ Set Time
                          </button>
                          <button
                            onClick={() => setEditingPickupTime(prev => {
                              const newState = { ...prev };
                              delete newState[order.id];
                              return newState;
                            })}
                            className="px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors shadow-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes Section */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📝</span>
                      <p className="font-bold text-purple-800">Special Notes</p>
                    </div>
                    {order.adminNotes ? (
                      <div className="flex items-start gap-3">
                        <p className="text-purple-900 flex-1 font-medium italic">"{order.adminNotes}"</p>
                        <button
                          onClick={() => setEditingNotes(prev => ({ 
                            ...prev, 
                            [order.id]: prev[order.id] || order.adminNotes 
                          }))}
                          className="text-purple-600 hover:text-purple-800 font-medium underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNotes(prev => ({ ...prev, [order.id]: '' }))}
                        className="text-purple-600 hover:text-purple-800 font-medium underline"
                      >
                        + Add special instructions for customer
                      </button>
                    )}
                    
                    {editingNotes[order.id] !== undefined && (
                      <div className="mt-4 p-4 bg-white border-2 border-purple-300 rounded-lg">
                        <textarea
                          value={editingNotes[order.id]}
                          onChange={(e) => setEditingNotes(prev => ({ 
                            ...prev, 
                            [order.id]: e.target.value 
                          }))}
                          placeholder="Add special notes (e.g., 'Extra hot', 'Less sugar', 'Made with love ❤️')"
                          className="w-full border-2 border-purple-300 rounded-lg px-4 py-3 font-medium focus:border-purple-500 focus:outline-none"
                          rows="3"
                        />
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => updateAdminNotes(order.id)}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md"
                          >
                            💾 Save Notes
                          </button>
                          <button
                            onClick={() => setEditingNotes(prev => {
                              const newState = { ...prev };
                              delete newState[order.id];
                              return newState;
                            })}
                            className="px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors shadow-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Update Buttons */}
                  <div className="bg-gradient-to-r from-stone-50 to-amber-50 rounded-xl p-4 border border-stone-200">
                    <p className="font-bold text-stone-800 mb-3">🔄 Update Order Status</p>
                    <div className="flex flex-wrap gap-3">
                      {["Accepted", "Ready", "Collected", "Rejected"].map(status => (
                        <button
                          key={status}
                          className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-md hover:shadow-lg ${
                            status === order.status
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : status === "Rejected"
                              ? "bg-red-600 hover:bg-red-700 text-white transform hover:scale-105"
                              : status === "Collected"
                              ? "bg-stone-600 hover:bg-stone-700 text-white transform hover:scale-105"
                              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white transform hover:scale-105"
                          }`}
                          onClick={() => quickUpdateStatus(order.id, status)}
                          disabled={status === order.status}
                          title={status === order.status ? `Already ${status}` : `Mark as ${status}`}
                        >
                          {getStatusIcon(status)} {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;