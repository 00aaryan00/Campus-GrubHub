import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Load existing menu on mount
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        // ✅ Fixed: Use admin-dashboard endpoint to get all items
        const res = await axios.get("http://localhost:5000/auntys-cafe/admin-dashboard");
        console.log("Fetched menu items:", res.data.items);
        setItems(res.data.items || []);
      } catch (err) {
        console.error("Error fetching admin menu:", err);
        alert("Error loading menu items. Check console for details.");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { name: "", price: "", veg: true, available: true }]);
  };

  const handleDeleteItem = async (name) => {
    if (!name || name.trim() === "") {
      alert("Cannot delete item without a name");
      return;
    }

    if (!window.confirm(`Delete "${name}" from menu?`)) return;

    try {
      console.log("Attempting to delete:", name);
      
      // ✅ Fixed: Make sure we're using the correct URL format
      const deleteUrl = `http://localhost:5000/auntys-cafe/admin-dashboard/${encodeURIComponent(name)}`;
      console.log("Delete URL:", deleteUrl);
      
      const response = await axios.delete(deleteUrl);
      console.log("Delete response:", response.data);
      
      // Update the UI immediately
      setItems(prevItems => prevItems.filter(item => item.name !== name));
      alert(`Successfully deleted "${name}"`);
    } catch (err) {
      console.error("Delete error:", err);
      
      // Better error handling
      if (err.response) {
        console.error("Error response:", err.response.data);
        alert(`Error deleting item: ${err.response.data.error || err.response.data.details || 'Unknown error'}`);
      } else if (err.request) {
        console.error("No response received:", err.request);
        alert("Error: No response from server. Check if the server is running.");
      } else {
        console.error("Request error:", err.message);
        alert(`Error: ${err.message}`);
      }
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validate items before submitting
      const validItems = items.filter(item => 
        item.name && item.name.trim() !== "" && item.price > 0
      );

      if (validItems.length === 0) {
        alert("Please add at least one valid item with name and price.");
        return;
      }

      console.log("Submitting items:", validItems);

      const response = await axios.post("http://localhost:5000/auntys-cafe/admin-dashboard", {
        items: validItems
      });
      
      console.log("Submit response:", response.data);
      alert("Menu updated successfully!");
    } catch (err) {
      console.error("Submit error:", err);
      if (err.response) {
        alert(`Error updating menu: ${err.response.data.error || 'Unknown error'}`);
      } else {
        alert("Error updating menu. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccessPreOrder = () => {
    // Navigate to the pre-order page
    window.open("http://localhost:5173/auntys-cafe/preorder", "_blank");
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Update Today's Special Menu</h2>
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
          Access Aunty's Cafe Pre-Order
        </button>
      </div>
      
      {items.length === 0 && (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No menu items found. Click "Add Another Item" to start adding items.
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} style={{ 
          border: "1px solid #ccc", 
          padding: "15px", 
          marginBottom: "10px",
          borderRadius: "5px",
          backgroundColor: "#f9f9f9"
        }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Item name"
              value={item.name || ""}
              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
              style={{ minWidth: "150px" }}
            />
            <input
              type="number"
              placeholder="Price"
              value={item.price || ""}
              onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
              style={{ width: "80px" }}
            />
            <select
              value={item.veg ? "veg" : "nonveg"}
              onChange={(e) => handleUpdateItem(index, 'veg', e.target.value)}
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
          
          {/* Debug info for development */}
          {item.name && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
              Normalized ID: {item.name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_")}
            </div>
          )}
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
          Submit Menu
        </button>
      </div>
      
      {/* Debug section - remove in production */}
      <div style={{ marginTop: "30px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
        <h4>Debug Info:</h4>
        <p>Total items: {items.length}</p>
        <p>Server URL: http://localhost:5000</p>
        <p>Items with names: {items.filter(item => item.name && item.name.trim() !== "").length}</p>
      </div>
    </div>
  );
}