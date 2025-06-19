import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { NotificationManager } from '../utils/notifications';

const PreOrderMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "specialMenu"));
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

      const orderData = {
        itemName: selectedItem.name,
        dishId: selectedItem.dishId,
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

      const docRef = await addDoc(collection(db, "preOrders"), orderData);

      const orderWithId = {
        id: docRef.id,
        ...orderData,
        orderTime: new Date(),
      };

      NotificationManager.showNewOrderNotification(orderWithId, true);

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

  const getItemIcon = (item) => {
    const name = item.name.toLowerCase();
    if (name.includes('coffee') || name.includes('espresso') || name.includes('latte') || name.includes('cappuccino')) return '☕';
    if (name.includes('tea') || name.includes('chai')) return '🫖';
    if (name.includes('cake') || name.includes('pastry') || name.includes('dessert')) return '🍰';
    if (name.includes('sandwich') || name.includes('burger')) return '🥪';
    if (name.includes('pasta') || name.includes('noodles')) return '🍝';
    if (name.includes('pizza')) return '🍕';
    if (name.includes('salad')) return '🥗';
    if (name.includes('soup')) return '🍲';
    return item.veg ? '🌱' : '🍗';
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
        <div className="bg-gradient-to-r from-amber-800 to-yellow-700 rounded-xl shadow-lg p-8 mb-8 text-white text-center">
          <div className="text-6xl mb-4">☕</div>
          <h1 className="text-5xl font-bold mb-3">Aunty's Café</h1>
          <p className="text-xl text-amber-100 mb-4">Pre-Order Menu</p>
          <p className="text-amber-200">Order ahead, skip the wait, savor the moment</p>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-3xl">📋</div>
            <div>
              <h3 className="font-bold text-blue-800 text-lg mb-2">How it works:</h3>
              <p className="text-blue-700">
                Place your order, make payment, and we'll assign your pickup time. 
                Get notified when your delicious treats are ready!
              </p>
            </div>
          </div>
        </div>

        {menuItems.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-2xl text-amber-800 font-semibold mb-2">Kitchen's taking a break</p>
            <p className="text-amber-600">Check back soon for fresh delights!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <div className="p-6">
                  {/* Item Icon & Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full flex items-center justify-center text-3xl">
                      {getItemIcon(item)}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.veg 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-orange-100 text-orange-800 border border-orange-200'
                    }`}>
                      {item.veg ? '🌱 Veg' : '🍗 Non-Veg'}
                    </div>
                  </div>

                  {/* Item Details */}
                  <h3 className="text-xl font-bold text-amber-900 mb-3 line-clamp-2">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{item.price}
                    </div>
                    <div className="text-sm text-amber-600 font-medium">
                      Fresh & Ready
                    </div>
                  </div>

                  {/* Order Button */}
                  <button
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    onClick={() => startOrder(item)}
                  >
                    🛒 Order Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white p-6 relative">
                <button 
                  className="absolute top-4 right-4 text-white hover:text-amber-200 text-2xl font-bold"
                  onClick={() => setSelectedItem(null)}
                >
                  ×
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {getItemIcon(selectedItem)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedItem.name}</h3>
                    <p className="text-amber-100">₹{selectedItem.price} each</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {step === 1 && (
                  <>
                    <h4 className="text-lg font-bold text-amber-800 mb-4">🔢 How many would you like?</h4>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full font-bold hover:bg-amber-200 transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center border-2 border-amber-300 rounded-lg px-3 py-2 font-bold text-lg focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full font-bold hover:bg-amber-200 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-800">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">₹{selectedItem.price * quantity}</span>
                      </div>
                    </div>

                    <button
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg"
                      onClick={() => setStep(2)}
                    >
                      💳 Proceed to Payment
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h4 className="text-lg font-bold text-amber-800 mb-4 text-center">📱 Scan & Pay</h4>
                    
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4 border-2 border-dashed border-gray-300">
                      <img
                        src="/scanner.jpg"
                        alt="Payment QR Code"
                        className="w-full h-64 object-contain rounded-lg"
                      />
                    </div>

                    <div className="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-amber-800">{selectedItem.name}</span>
                        <span className="text-amber-700">×{quantity}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-amber-800">Amount to Pay:</span>
                        <span className="text-green-600">₹{selectedItem.price * quantity}</span>
                      </div>
                    </div>

                    <button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
                      onClick={handlePlaceOrder}
                      disabled={isOrdering}
                    >
                      {isOrdering ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Placing Order...
                        </span>
                      ) : (
                        "✅ I have paid - Confirm Order"
                      )}
                    </button>
                  </>
                )}

                {step === 3 && (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h4 className="text-2xl font-bold text-green-600 mb-4">Order Placed Successfully!</h4>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
                      <div className="text-green-800">
                        <p className="font-bold mb-2">What happens next?</p>
                        <div className="text-left space-y-2">
                          <p className="flex items-center gap-2">
                            <span>1️⃣</span> Admin confirms your payment
                          </p>
                          <p className="flex items-center gap-2">
                            <span>2️⃣</span> We start preparing your order
                          </p>
                          <p className="flex items-center gap-2">
                            <span>3️⃣</span> You'll get pickup time notification
                          </p>
                          <p className="flex items-center gap-2">
                            <span>4️⃣</span> Come & enjoy your treats!
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-3 rounded-lg font-bold hover:from-amber-700 hover:to-yellow-700 transition-all duration-200 shadow-lg"
                      onClick={() => setSelectedItem(null)}
                    >
                      🏠 Back to Menu
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreOrderMenu;