import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { NotificationManager } from '../utils/notifications'; // ✅ IMPORT ADDED

const PreOrderMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(1); // 1: qty input, 2: payment, 3: placed
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'specialMenu'));
        const items = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.available) {
            items.push({ id: doc.id, ...data });
          }
        });
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);
      }
    };

    fetchMenu();
  }, []);

  const startOrder = (item) => {
    setSelectedItem(item);
    setQuantity(1);
    setStep(1);
  };

  const handlePlaceOrder = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("Please login to place an order");
        return;
      }

      const { uid, email, displayName } = user;

      setIsOrdering(true);

      // ✅ CREATE ORDER DATA OBJECT
      const orderData = {
        itemName: selectedItem.name,
        price: selectedItem.price,
        quantity,
        totalAmount: selectedItem.price * quantity,
        userEmail: email || "",
        userId: uid,
        userName: displayName || "",
        orderTime: serverTimestamp(),
        paid: true,
        status: "Pending",
        pickupTime: null,
        adminNotes: ""
      };

      // ✅ SAVE TO DATABASE
      const docRef = await addDoc(collection(db, "preOrders"), orderData);

      // ✅ TRIGGER ADMIN NOTIFICATION - This was missing!
      const orderWithId = {
        id: docRef.id,
        ...orderData,
        orderTime: new Date(), // Use current date for immediate notification
      };

      // Notify admin about new order
      NotificationManager.showNewOrderNotification(orderWithId, true); // true = isAdmin

      console.log('🔔 New order notification sent to admin:', {
        orderId: docRef.id,
        itemName: selectedItem.name,
        customerEmail: email
      });

      setStep(3);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order.");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Aunty's Café Pre-Order Menu</h2>
      <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          📋 Place your order and admin will assign your pickup time after payment confirmation.
        </p>
      </div>

      {menuItems.length === 0 ? (
        <p className="text-gray-500">No items available right now.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map(item => (
            <div key={item.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md">
              <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
              <p className="text-lg text-green-600 mb-2">₹{item.price}</p>
              <p className="mb-3 text-sm">{item.veg ? '🌱 Vegetarian' : '🍗 Non-Vegetarian'}</p>
              <button
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => startOrder(item)}
              >
                Order
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quantity & Payment Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 relative">
            <button className="absolute top-2 right-3 text-xl" onClick={() => setSelectedItem(null)}>×</button>
            {step === 1 && (
              <>
                <h3 className="text-lg font-bold mb-2">Select Quantity</h3>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full mb-4 border px-3 py-2 rounded"
                />
                <p className="mb-2">Amount: ₹{selectedItem.price * quantity}</p>
                <button
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={() => setStep(2)}
                >
                  Proceed to Pay
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="text-lg font-bold mb-3">Scan to Pay</h3>
                <img src="/scanner.jpg" alt="Scanner QR" className="w-full h-52 object-contain mb-4 border rounded" />
                <p className="text-sm text-gray-600 mb-2">Amount: ₹{selectedItem.price * quantity}</p>
                <button
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                >
                  {isOrdering ? 'Placing Order...' : 'I have paid'}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <h3 className="text-lg font-bold mb-3 text-green-600">✅ Order Placed!</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Admin will assign your pickup time soon. Thank you!
                </p>
                <button
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 mt-3"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreOrderMenu;