import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { NotificationManager } from "../utils/notifications";
import { v4 as uuidv4 } from "uuid";
import { Coffee, Plus, Search, Trash2, Bell, ShoppingCart, Eye, EyeOff, Check, X } from "lucide-react";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previousItems, setPreviousItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeletePopup, setShowDeletePopup] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  // REMOVED: useMenuNotifications hook - global system handles all notifications

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const permissionGranted = await NotificationManager.requestPermission();
        if (permissionGranted) {
          console.log("Notification permissions granted");
          NotificationManager.showToast("Notifications enabled for menu updates", "success");
        } else {
          console.log("Notification permissions denied");
          NotificationManager.showToast("Enable notifications for better experience", "warning");
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
      await fetchMenu();
    };

    initializeComponent();
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/auntys-cafe/admin-dashboard");
      const fetchedItems = res.data.items || [];
      setItems(fetchedItems);
      setPreviousItems(fetchedItems);
    } catch (err) {
      console.error("Error fetching admin menu:", err);
      NotificationManager.showToast("Error loading menu items", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddItem = () => {
    const newItem = {
      name: "",
      price: "",
      veg: true,
      available: true,
      isNew: true,
      dishId: uuidv4(),
    };
    setItems([...items, newItem]);
    NotificationManager.showToast("New item slot added. Fill details and submit to save.", "info");
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === "price") {
      newItems[index][field] = Number(value);
    } else if (field === "veg") {
      newItems[index][field] = value === "veg";
    } else if (field === "available") {
      newItems[index][field] = value;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleDeleteItem = async (item) => {
    try {
      setLoading(true);
      await axios.delete("http://localhost:5000/auntys-cafe/admin-dashboard", {
        data: { dishName: item.name, dishId: item.dishId },
      });
      setItems(items.filter((i) => i.dishId !== item.dishId));
      setPreviousItems(previousItems.filter((i) => i.dishId !== item.dishId));
      NotificationManager.showToast(`Dish "${item.name}" deleted permanently`, "success");
    } catch (err) {
      console.error("Error deleting item:", err);
      NotificationManager.showToast(`Error deleting dish: ${err.response?.data?.error || err.message}`, "error");
    } finally {
      setLoading(false);
      setShowDeletePopup(null);
    }
  };

  const detectNewItems = (currentItems, previousItems) => {
    const previousItemNames = new Set(previousItems.map((item) => item.name?.trim().toLowerCase()));
    return currentItems.filter(
      (item) =>
        item.name &&
        item.name.trim() !== "" &&
        item.price > 0 &&
        !previousItemNames.has(item.name.trim().toLowerCase())
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const validItems = items.filter((item) => item.name && item.name.trim() !== "" && item.price > 0);
      if (validItems.length === 0) {
        NotificationManager.showToast("Please add at least one valid item with name and price.", "warning");
        return;
      }

      const newItems = detectNewItems(validItems, previousItems);
      const itemsWithAvailability = validItems.map((item) => ({
        ...item,
        availabilityHistory: item.isNew
          ? [{ availableFrom: new Date().toISOString(), availableTo: item.available ? null : new Date().toISOString() }]
          : item.availabilityHistory || [{ availableFrom: new Date().toISOString(), availableTo: item.available ? null : new Date().toISOString() }],
      }));

      const response = await axios.post("http://localhost:5000/auntys-cafe/admin-dashboard", {
        items: itemsWithAvailability,
      });

      // Show admin feedback
      if (newItems.length > 0) {
        if (newItems.length === 1) {
          NotificationManager.showToast(
            `New dish "${newItems[0].name}" added to today's menu!`,
            'success'
          );
        } else {
          NotificationManager.showToast(
            `${newItems.length} new dishes added to today's menu!`,
            'success'
          );
        }

        newItems.forEach(dish => {
          NotificationManager.showNewDishNotification(dish, false);
        });
      }

      // General success feedback
      NotificationManager.showToast(
        `Menu updated successfully with ${validItems.length} items`,
        'success'
      );

      setPreviousItems(validItems);
      setItems(validItems.map((item) => ({ ...item, isNew: false })));
    } catch (err) {
      console.error("Submit error:", err);
      let errorMessage = err.response?.data?.error || err.message || "Unknown error occurred";
      NotificationManager.showToast(`Error updating menu: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessPreOrder = () => {
    window.open("http://localhost:5173/admin/orders", "_blank");
    NotificationManager.showToast("Opening pre-orders management", "info");
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200">
          <div className="flex items-center space-x-4">
            <Coffee className="w-8 h-8 text-amber-600 animate-spin" />
            <div>
              <div className="text-xl font-bold text-amber-900">Brewing your dashboard...</div>
              <div className="text-sm text-amber-700 mt-1">
                Please wait while we prepare your menu items
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-800 via-orange-700 to-amber-900 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Aunty's Café Dashboard</h1>
                <p className="text-amber-100 mt-1 flex items-center">
                  <Bell className="w-4 h-4 mr-2" />
                  Real-time notifications enabled - customers will be notified of menu changes
                </p>
              </div>
            </div>
            <button
              onClick={handleAccessPreOrder}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Manage Pre-Orders</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for dishes, beverages, or snacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-amber-300 rounded-xl text-lg placeholder-amber-600 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200 transition-all duration-200"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg border-2 border-dashed border-amber-300 mb-8">
            <Coffee className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-amber-900 mb-2">
              {searchQuery ? "No matching items found" : "No menu items yet"}
            </h3>
            <p className="text-amber-700 mb-4">
              {searchQuery 
                ? "Try adjusting your search terms or add new items to the menu." 
                : "Start building your café menu by adding delicious items!"
              }
            </p>
            <div className="bg-amber-100 rounded-lg p-4 inline-block">
              <p className="text-amber-800 text-sm">
                💡 <strong>Pro Tip:</strong> Customers receive instant notifications when new items are added!
              </p>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="space-y-4 mb-8">
          {filteredItems.map((item, index) => (
            <div
              key={item.dishId}
              className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                item.isNew 
                  ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50' 
                  : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              {item.isNew && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  ✨ NEW
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                {/* Item Name */}
                <div className="lg:col-span-2">
                  <input
                    placeholder="Enter dish name (e.g., Cappuccino, Sandwich)"
                    value={item.name || ""}
                    onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-amber-900 placeholder-amber-500 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      item.isNew 
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200 bg-white' 
                        : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white/80'
                    }`}
                  />
                </div>

                {/* Price */}
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price || ""}
                      onChange={(e) => handleUpdateItem(index, "price", e.target.value)}
                      className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 font-medium text-amber-900 placeholder-amber-500 focus:outline-none focus:ring-4 transition-all duration-200 ${
                        item.isNew 
                          ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200 bg-white' 
                          : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white/80'
                      }`}
                    />
                  </div>
                </div>

                {/* Veg/Non-Veg */}
                <div>
                  <select
                    value={item.veg ? "veg" : "nonveg"}
                    onChange={(e) => handleUpdateItem(index, "veg", e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-amber-900 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      item.isNew 
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200 bg-white' 
                        : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white/80'
                    }`}
                  >
                    <option value="veg">🌱 Vegetarian</option>
                    <option value="nonveg">🍖 Non-Vegetarian</option>
                  </select>
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center justify-center">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.available || false}
                      onChange={(e) => handleUpdateItem(index, "available", e.target.checked)}
                      className="hidden"
                    />
                    <div className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      item.available 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}>
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center ${
                        item.available ? 'translate-x-6' : 'translate-x-0'
                      }`}>
                        {item.available ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-gray-500" />}
                      </div>
                    </div>
                    <span className={`font-medium ${item.available ? 'text-emerald-700' : 'text-gray-600'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </label>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDeletePopup(item)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={handleAddItem}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Item</span>
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Coffee className="w-5 h-5 animate-spin" />
                <span>Updating Menu...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Update Menu</span>
              </>
            )}
          </button>
        </div>

        {/* Dashboard Status */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
          <h4 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
            <Coffee className="w-6 h-6 mr-2" />
            Dashboard Status
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{items.length}</div>
              <div className="text-sm text-amber-600">Total Items</div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">
                {items.filter(item => item.name && item.name.trim() !== "" && item.price > 0).length}
              </div>
              <div className="text-sm text-emerald-600">Valid Items</div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{items.filter(item => item.isNew).length}</div>
              <div className="text-sm text-green-600">New Items</div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{items.filter(item => item.available).length}</div>
              <div className="text-sm text-blue-600">Available</div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-emerald-700">{Notification.permission === 'granted' ? '✅' : '❌'}</div>
              <div className="text-sm text-emerald-600">Notifications</div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-emerald-700">✅</div>
              <div className="text-sm text-emerald-600">Global System</div>
            </div>
          </div>
          <div className="mt-4 bg-amber-100 rounded-lg p-4">
            <p className="text-amber-800 text-sm flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              <strong>Smart Notifications:</strong> The global system automatically monitors menu changes and notifies all customers in real-time when new items are added or availability changes.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete <strong>"{showDeletePopup.name}"</strong>? 
                This will remove all associated data including votes and customer feedback.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleDeleteItem(showDeletePopup)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Delete Forever
                </button>
                <button
                  onClick={() => setShowDeletePopup(null)}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cafe Link */}
      <Link to="/auntys-cafe">
        <button
          className="fixed bottom-6 right-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-40"
        >
          <Coffee className="w-6 h-6" />
        </button>
      </Link>
    </div>
  );
}

