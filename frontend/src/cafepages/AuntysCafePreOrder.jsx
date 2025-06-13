import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

const PreOrderMenu = () => {
  const [menuItems, setMenuItems] = useState([]);

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

  const handleOrder = async (item) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        alert("Please login to place an order");
        return;
      }

      const email = user.email;

      await addDoc(collection(db, "preOrders"), {
        itemName: item.name,
        price: item.price,
        userEmail: email,
        userId: user.uid,
        quantity: 1,
        orderTime: serverTimestamp(),
        status: "Pending",
        pickupTime: null, // Admin will set this
        adminNotes: ""
      });

      alert(`Order placed for ${item.name}! Admin will assign pickup time soon.`);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Try again.");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Aunty's Café Pre-Order Menu</h2>
      
      <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          📋 Place your order and admin will assign your pickup time based on availability
        </p>
      </div>

      {menuItems.length === 0 ? (
        <p className="text-gray-500">No items available right now.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map(item => (
            <div key={item.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
              <p className="text-lg font-medium text-green-600 mb-2">₹{item.price}</p>
              <p className="mb-3 text-sm">
                {item.veg ? '🌱 Vegetarian' : '🍗 Non-Vegetarian'}
              </p>
              <button
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                onClick={() => handleOrder(item)}
              >
                Place Order
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreOrderMenu;