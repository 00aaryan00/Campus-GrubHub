import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { NotificationManager } from "../utils/notifications";
import { useMenuNotifications } from "../hooks/useRealtimeNotifications";
import { v4 as uuidv4 } from "uuid";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previousItems, setPreviousItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeletePopup, setShowDeletePopup] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const { notifyNewDish, notifyMenuUpdate } = useMenuNotifications();

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
    if (!item.name || item.name.trim() === "") {
      NotificationManager.showToast("Cannot delete item without a name", "warning");
      return;
    }

    try {
      setLoading(true);
      console.log("Attempting to delete:", item.name);
      const response = await axios.delete("http://localhost:5000/auntys-cafe/admin-dashboard", {
        data: { dishName: item.name, dishId: item.dishId },
      });
      console.log("Delete response:", response.data);

      // Update UI immediately
      setItems(items.filter((i) => i.dishId !== item.dishId));
      setPreviousItems(previousItems.filter((i) => i.dishId !== item.dishId));
      NotificationManager.showToast(`Dish "${item.name}" deleted permanently`, "success");
    } catch (err) {
      console.error("Delete error:", err);
      let errorMessage = err.response?.data?.error || err.message || "Unknown error occurred";
      NotificationManager.showToast(`Error deleting dish: ${errorMessage}`, "error");
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

      console.log("Submit response:", response.data);

      if (newItems.length > 0) {
        newItems.forEach((item, index) => {
          setTimeout(() => {
            notifyNewDish(item.name, item.price, item.veg);
          }, index * 1000);
        });
        NotificationManager.showToast(
          newItems.length === 1
            ? `New dish "${newItems[0].name}" added to today's menu!`
            : `${newItems.length} new dishes added to today's menu!`,
          "success"
        );
        newItems.forEach((dish) => {
          NotificationManager.showNewDishNotification(dish, false);
        });
      }

      notifyMenuUpdate(validItems.length);
      NotificationManager.showToast(`Menu updated successfully with ${validItems.length} items`, "success");
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
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>Loading...</div>
        <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
          Please wait while we load the menu items...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2>Update Today's Special Menu</h2>
          <p style={{ color: "#666", fontSize: "14px", margin: "5px 0 0 0" }}>
            🔔 Real-time notifications enabled - users will be notified of menu changes
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleAccessPreOrder}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ff6b35",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Manage Cafe Pre-Orders
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "16px",
          }}
        />
      </div>

      {filteredItems.length === 0 && (
        <div
          style={{
            padding: "20px",
            border: "2px dashed #ccc",
            borderRadius: "8px",
            textAlign: "center",
            backgroundColor: "#f9f9f9",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#666", fontStyle: "italic", margin: "0 0 10px 0" }}>
            {searchQuery ? "No dishes match your search." : "No menu items found. Click 'Add Another Item' to start adding items."}
          </p>
          <p style={{ color: "#888", fontSize: "14px", margin: "0" }}>
            💡 Tip: Users will receive notifications when new dishes are added!
          </p>
        </div>
      )}

      <Link to="/auntys-cafe">
        <button className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow-md">
          Go to Aunty's Cafe
        </button>
      </Link>

      {filteredItems.map((item, index) => (
        <div
          key={item.dishId}
          style={{
            border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
            padding: "15px",
            marginBottom: "10px",
            borderRadius: "5px",
            backgroundColor: item.isNew ? "#f0fdf4" : "#f9f9f9",
            position: "relative",
          }}
        >
          {item.isNew && (
            <div
              style={{
                position: "absolute",
                top: "-8px",
                right: "10px",
                backgroundColor: "#10b981",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              NEW
            </div>
          )}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Item name"
              value={item.name || ""}
              onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
              style={{
                minWidth: "150px",
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
              }}
            />
            <input
              type="number"
              placeholder="Price"
              value={item.price || ""}
              onChange={(e) => handleUpdateItem(index, "price", e.target.value)}
              style={{
                width: "80px",
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
              }}
            />
            <select
              value={item.veg ? "veg" : "nonveg"}
              onChange={(e) => handleUpdateItem(index, "veg", e.target.value)}
              style={{
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
              }}
            >
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="checkbox"
                checked={item.available || false}
                onChange={(e) => handleUpdateItem(index, "available", e.target.checked)}
              />
              Available
            </label>
            <button
              onClick={() => setShowDeletePopup(item)}
              style={{
                padding: "8px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {showDeletePopup && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>Confirm Deletion</h3>
            <p style={{ marginBottom: "20px" }}>
              Are you sure you want to permanently delete "{showDeletePopup.name}"? This will remove all associated votes and feedback.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => handleDeleteItem(showDeletePopup)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeletePopup(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleAddItem}
          style={{
            padding: "10px 15px",
            marginRight: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          Add Another Item
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: "10px 15px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Updating..." : "Submit Menu"}
        </button>
      </div>

      <div style={{ 
        marginTop: "20px", 
        padding: "15px", 
        backgroundColor: "#e7f3ff", 
        borderRadius: "8px",
        border: "1px solid #b3d9ff"
      }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#0066cc" }}>📊 Dashboard Status</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "14px" }}>
          <div><strong>Total items:</strong> {items.length}</div>
          <div><strong>Valid items:</strong> {items.filter(item => item.name && item.name.trim() !== "" && item.price > 0).length}</div>
          <div><strong>New items:</strong> {items.filter(item => item.isNew).length}</div>
          <div><strong>Available items:</strong> {items.filter(item => item.available).length}</div>
          <div><strong>Notifications:</strong> 
            <span style={{ 
              color: Notification.permission === 'granted' ? '#10b981' : '#ef4444',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {Notification.permission === 'granted' ? '✅ Enabled' : '❌ Disabled'}
            </span>
          </div>
          <div><strong>Global System:</strong> 
            <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: '5px' }}>
              ✅ Active
            </span>
          </div>
        </div>
        <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#666" }}>
          💡 The global notification system automatically monitors menu changes and notifies all users in real-time.
        </p>
      </div>
    </div>
  );
}