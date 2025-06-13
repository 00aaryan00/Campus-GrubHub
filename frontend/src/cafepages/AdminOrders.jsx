import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        status: newStatus
      });
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updatePickupTime = async (orderId) => {
    const newTime = editingPickupTime[orderId];
    if (!newTime) return;

    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        pickupTime: newTime
      });
      setEditingPickupTime(prev => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (error) {
      console.error("Error updating pickup time:", error);
    }
  };

  const updateAdminNotes = async (orderId) => {
    const notes = editingNotes[orderId];
    
    try {
      await updateDoc(doc(db, 'preOrders', orderId), {
        adminNotes: notes || ''
      });
      setEditingNotes(prev => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (error) {
      console.error("Error updating notes:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-blue-100 text-blue-800';
      case 'Ready': return 'bg-green-100 text-green-800';
      case 'Collected': return 'bg-gray-100 text-gray-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Admin - Pre-Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{order.itemName}</h3>
                    <p className="text-gray-600">₹{order.price}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1"><strong>Customer:</strong></p>
                    <p className="text-gray-900">{order.userName || order.userEmail}</p>
                    {order.userName && (
                      <p className="text-sm text-gray-500">{order.userEmail}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1"><strong>Order Time:</strong></p>
                    <p className="text-gray-900">{formatTime(order.orderTime)}</p>
                  </div>
                </div>

                {/* Pickup Time Section - FIXED */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pickup Time:</p>
                  {order.pickupTime ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">✓ {order.pickupTime}</span>
                      <button
                        onClick={() => setEditingPickupTime(prev => ({ 
                          ...prev, 
                          [order.id]: prev[order.id] || order.pickupTime 
                        }))}
                        className="text-blue-500 hover:text-blue-700 text-sm underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingPickupTime(prev => ({ ...prev, [order.id]: '' }))}
                      className="text-orange-600 font-medium hover:text-orange-700 cursor-pointer underline"
                    >
                      ⏱ Not assigned yet - Click to set time
                    </button>
                  )}
                  
                  {editingPickupTime[order.id] !== undefined && (
                    <div className="mt-3 p-3 border border-blue-200 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-800 mb-2">Set Pickup Time:</p>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={editingPickupTime[order.id]}
                          onChange={(e) => setEditingPickupTime(prev => ({ 
                            ...prev, 
                            [order.id]: e.target.value 
                          }))}
                          className="border rounded px-3 py-2 text-sm min-w-[120px]"
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
                          className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Set Time
                        </button>
                        <button
                          onClick={() => setEditingPickupTime(prev => {
                            const newState = { ...prev };
                            delete newState[order.id];
                            return newState;
                          })}
                          className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Notes Section */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Notes:</p>
                  {order.adminNotes ? (
                    <div className="flex items-start gap-2">
                      <p className="text-gray-900 flex-1">{order.adminNotes}</p>
                      <button
                        onClick={() => setEditingNotes(prev => ({ 
                          ...prev, 
                          [order.id]: prev[order.id] || order.adminNotes 
                        }))}
                        className="text-blue-500 hover:text-blue-700 text-sm underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(prev => ({ ...prev, [order.id]: '' }))}
                      className="text-blue-500 hover:text-blue-700 text-sm underline"
                    >
                      + Add notes
                    </button>
                  )}
                  
                  {editingNotes[order.id] !== undefined && (
                    <div className="mt-3 p-3 border border-blue-200 bg-white rounded">
                      <textarea
                        value={editingNotes[order.id]}
                        onChange={(e) => setEditingNotes(prev => ({ 
                          ...prev, 
                          [order.id]: e.target.value 
                        }))}
                        placeholder="Add notes for customer..."
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows="3"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateAdminNotes(order.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Save Notes
                        </button>
                        <button
                          onClick={() => setEditingNotes(prev => {
                            const newState = { ...prev };
                            delete newState[order.id];
                            return newState;
                          })}
                          className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Update Buttons */}
                <div className="flex flex-wrap gap-2">
                  {["Accepted", "Ready", "Collected", "Rejected"].map(status => (
                    <button
                      key={status}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        status === order.status
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : status === "Rejected"
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : status === "Collected"
                          ? "bg-gray-600 hover:bg-gray-700 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                      onClick={() => updateStatus(order.id, status)}
                      disabled={status === order.status}
                    >
                      Mark as {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;