import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const today = new Date().toISOString().slice(0, 10);

  // Load existing menu on mount
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auntys-cafe/auntys-cafe");
        setItems(res.data.items || []);
      } catch (err) {
        console.error("Error fetching today's menu:", err);
      }
    };
    fetchMenu();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { name: "", price: "", veg: true, available: true }]);
  };

  const handleDeleteItem = async (name) => {
    if (!window.confirm(`Delete "${name}" from today's menu?`)) return;

    try {
      await axios.delete(`http://localhost:5000/auntys-cafe/admin-dashboard/${today}/${name}`);
      setItems(items.filter(item => item.name !== name));
      alert(`Deleted "${name}"`);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting item");
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post("http://localhost:5000/auntys-cafe/admin-dashboard", {
        date: today,
        items
      });
      alert("Menu updated!");
    } catch (err) {
      console.error(err);
      alert("Error updating menu");
    }
  };

  return (
    <div>
      <h2>Update Today’s Special Menu</h2>

      {items.map((item, index) => (
        <div key={index} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <input
            placeholder="Item name"
            value={item.name}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].name = e.target.value;
              setItems(newItems);
            }}
          />
          <input
            type="number"
            placeholder="Price"
            value={item.price}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].price = Number(e.target.value);
              setItems(newItems);
            }}
          />
          <select
            value={item.veg ? "veg" : "nonveg"}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].veg = e.target.value === "veg";
              setItems(newItems);
            }}
          >
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
          </select>

          <label>
            Available
            <input
              type="checkbox"
              checked={item.available}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].available = e.target.checked;
                setItems(newItems);
              }}
            />
          </label>

          <button
            style={{ marginLeft: 10, background: "red", color: "white" }}
            onClick={() => handleDeleteItem(item.name)}
          >
            Delete
          </button>
        </div>
      ))}

      <button onClick={handleAddItem}>Add Another Item</button>
      <button onClick={handleSubmit} style={{ marginLeft: 10 }}>Submit Menu</button>
    </div>
  );
}
