import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { NotificationManager } from "../utils/notifications"; // Add this import
import { useMenuNotifications } from "../hooks/useRealtimeNotifications"; // Add this import

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previousItems, setPreviousItems] = useState([]); // Track previous state for new dish detection
  const today = new Date().toISOString().slice(0, 10);
  
  // Use the menu notifications hook
  const { notifyNewDish, notifyMenuUpdate } = useMenuNotifications();

  // Load existing menu on mount
  useEffect(() => {
    const initializeComponent = async () => {
      // Request notification permission when component mounts
      try {
        const permissionGranted = await NotificationManager.requestPermission();
        if (permissionGranted) {
          console.log('Notification permissions granted');
          NotificationManager.showToast('Notifications enabled for menu updates', 'success');
        } else {
          console.log('Notification permissions denied');
          NotificationManager.showToast('Enable notifications for better experience', 'warning');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }

      // Fetch existing menu
      await fetchMenu();
    };

    initializeComponent();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/auntys-cafe/admin-dashboard");
      console.log("Fetched menu items:", res.data.items);
      const fetchedItems = res.data.items || [];
      setItems(fetchedItems);
      setPreviousItems(fetchedItems); // Store for comparison
    } catch (err) {
      console.error("Error fetching admin menu:", err);
      NotificationManager.showToast("Error loading menu items", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem = { name: "", price: "", veg: true, available: true, isNew: true };
    setItems([...items, newItem]);
    NotificationManager.showToast("New item slot added. Fill details and submit to save.", "info");
  };

  const handleDeleteItem = async (name) => {
    if (!name || name.trim() === "") {
      NotificationManager.showToast("Cannot delete item without a name", "warning");
      return;
    }

    if (!window.confirm(`Delete "${name}" from menu?`)) return;

    try {
      console.log("Attempting to delete:", name);

      const deleteUrl = `http://localhost:5000/auntys-cafe/admin-dashboard/${encodeURIComponent(name)}`;
      console.log("Delete URL:", deleteUrl);

      const response = await axios.delete(deleteUrl);
      console.log("Delete response:", response.data);

      // Update the UI immediately
      setItems(prevItems => prevItems.filter(item => item.name !== name));
      
      // Show success notifications
      NotificationManager.showNotification(
        `🗑️ Dish Removed: ${name}`,
        {
          body: `${name} has been removed from today's menu`,
          tag: `deleted-dish-${name}`,
          requireInteraction: false
        }
      );
      
      NotificationManager.showToast(`Successfully deleted "${name}"`, "success");
    } catch (err) {
      console.error("Delete error:", err);

      let errorMessage = "Unknown error occurred";
      if (err.response) {
        console.error("Error response:", err.response.data);
        errorMessage = err.response.data.error || err.response.data.details || 'Server error';
      } else if (err.request) {
        console.error("No response received:", err.request);
        errorMessage = "No response from server. Check if the server is running.";
      } else {
        console.error("Request error:", err.message);
        errorMessage = err.message;
      }

      NotificationManager.showToast(`Error deleting item: ${errorMessage}`, "error");
    }
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'price') {
      newItems[index][field] = Number(value);
    } else if (field === 'veg') {
      newItems[index][field] = value === "veg";
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const detectNewItems = (currentItems, previousItems) => {
    const previousItemNames = new Set(previousItems.map(item => item.name?.trim().toLowerCase()));
    return currentItems.filter(item => 
      item.name && 
      item.name.trim() !== "" && 
      item.price > 0 && 
      !previousItemNames.has(item.name.trim().toLowerCase())
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate items before submitting
      const validItems = items.filter(item =>
        item.name && item.name.trim() !== "" && item.price > 0
      );

      if (validItems.length === 0) {
        NotificationManager.showToast("Please add at least one valid item with name and price.", "warning");
        return;
      }

      // Detect new items before submitting
      const newItems = detectNewItems(validItems, previousItems);

      console.log("Submitting items:", validItems);
      console.log("New items detected:", newItems);

      const response = await axios.post("http://localhost:5000/auntys-cafe/admin-dashboard", {
        items: validItems
      });

      console.log("Submit response:", response.data);

      // Show notifications for new items
      if (newItems.length > 0) {
        // Show individual notifications for each new dish
        newItems.forEach((item, index) => {
          setTimeout(() => {
            notifyNewDish(item.name, item.price, item.veg);
          }, index * 1000); // Stagger notifications by 1 second
        });

        // Show summary toast
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
      }

      // General success notification
      notifyMenuUpdate(validItems.length);

      // Update previous items for next comparison
      setPreviousItems(validItems);

      // Remove the isNew flag from items
      setItems(validItems.map(item => ({ ...item, isNew: false })));

    } catch (err) {
      console.error("Submit error:", err);
      
      let errorMessage = "Unknown error occurred";
      if (err.response) {
        errorMessage = err.response.data.error || 'Server error';
      } else if (err.request) {
        errorMessage = "No response from server";
      } else {
        errorMessage = err.message;
      }

      NotificationManager.showToast(`Error updating menu: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessPreOrder = () => {
    // Navigate to the pre-order page
    window.open("http://localhost:5173/admin/orders", "_blank");
    NotificationManager.showToast("Opening pre-orders management", "info");
  };

  // Test notification function (you can remove this in production)
  const testNotifications = () => {
    NotificationManager.showNotification(
      "🧪 Test Notification",
      {
        body: "This is a test notification to check if everything works!",
        requireInteraction: false
      }
    );
    NotificationManager.showToast("Test notification sent!", "info");
  };

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
        <h2>Update Today's Special Menu</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Test notification button (remove in production) */}
          <button 
            onClick={testNotifications}
            style={{ 
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Test Notifications
          </button>
          
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
              fontWeight: "bold"
            }}
          >
            Manage Cafe Pre-Orders
          </button>
        </div>
      </div>
      
      {items.length === 0 && (
        <div style={{ 
          padding: "20px", 
          border: "2px dashed #ccc", 
          borderRadius: "8px", 
          textAlign: "center",
          backgroundColor: "#f9f9f9",
          marginBottom: "20px"
        }}>
          <p style={{ color: "#666", fontStyle: "italic", margin: "0 0 10px 0" }}>
            No menu items found. Click "Add Another Item" to start adding items.
          </p>
          <p style={{ color: "#888", fontSize: "14px", margin: "0" }}>
            💡 Tip: You'll receive notifications when new dishes are added!
          </p>
        </div>
      )}

      <Link to="/auntys-cafe">
        <button className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow-md">
          Go to Aunty's Cafe
        </button>
      </Link>

      {items.map((item, index) => (
        <div key={index} style={{
          border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
          padding: "15px",
          marginBottom: "10px",
          borderRadius: "5px",
          backgroundColor: item.isNew ? "#f0fdf4" : "#f9f9f9",
          position: "relative"
        }}>
          {item.isNew && (
            <div style={{
              position: "absolute",
              top: "-8px",
              right: "10px",
              backgroundColor: "#10b981",
              color: "white",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              NEW
            </div>
          )}
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Item name"
              value={item.name || ""}
              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
              style={{ 
                minWidth: "150px",
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px"
              }}
            />
            <input
              type="number"
              placeholder="Price"
              value={item.price || ""}
              onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
              style={{ 
                width: "80px",
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px"
              }}
            />
            <select
              value={item.veg ? "veg" : "nonveg"}
              onChange={(e) => handleUpdateItem(index, 'veg', e.target.value)}
              style={{ 
                border: item.isNew ? "2px solid #10b981" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px"
              }}
            >
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="checkbox"
                checked={item.available || false}
                onChange={(e) => handleUpdateItem(index, 'available', e.target.checked)}
              />
              Available
            </label>

            <button
              style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "5px 10px",
                borderRadius: "3px",
                cursor: "pointer"
              }}
              onClick={() => handleDeleteItem(item.name)}
              disabled={!item.name || item.name.trim() === ""}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

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
            cursor: "pointer"
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
            cursor: "pointer"
          }}
          disabled={loading}
        >
          {loading ? "Updating..." : "Submit Menu"}
        </button>
      </div>

      {/* Enhanced Debug section */}
      <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Debug Info:</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "14px" }}>
          <p><strong>Total items:</strong> {items.length}</p>
          <p><strong>Items with names:</strong> {items.filter(item => item.name && item.name.trim() !== "").length}</p>
          <p><strong>Valid items:</strong> {items.filter(item => item.name && item.name.trim() !== "" && item.price > 0).length}</p>
          <p><strong>New items:</strong> {items.filter(item => item.isNew).length}</p>
          <p><strong>Server URL:</strong> http://localhost:5000</p>
          <p><strong>Notifications:</strong> {Notification.permission}</p>
        </div>
      </div>
    </div>
  );
}