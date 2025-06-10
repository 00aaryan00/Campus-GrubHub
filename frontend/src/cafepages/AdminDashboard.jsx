// src/cafepages/AdminDashboard.jsx
import { useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [items, setItems] = useState([{ name: "", price: "", veg: true, available: true }]);

  const handleAddItem = () => {
    setItems([...items, { name: "", price: "", veg: true, available: true }]);
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:5000/admin-dashboard", {
        date: new Date().toISOString().slice(0, 10),
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
        <div key={index}>
          <input placeholder="Item name" onChange={(e) => {
            const newItems = [...items];
            newItems[index].name = e.target.value;
            setItems(newItems);
          }} />
          <input type="number" placeholder="Price" onChange={(e) => {
            const newItems = [...items];
            newItems[index].price = Number(e.target.value);
            setItems(newItems);
          }} />
          <select onChange={(e) => {
            const newItems = [...items];
            newItems[index].veg = e.target.value === "veg";
            setItems(newItems);
          }}>
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
          </select>
          <label>
            Available
            <input type="checkbox" checked={item.available} onChange={(e) => {
              const newItems = [...items];
              newItems[index].available = e.target.checked;
              setItems(newItems);
            }} />
          </label>
        </div>
      ))}
      <button onClick={handleAddItem}>Add Another Item</button>
      <button onClick={handleSubmit}>Submit Menu</button>
    </div>
  );
}
