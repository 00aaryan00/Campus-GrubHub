// src/cafepages/AuntysCafe.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


export default function AuntysCafe() {
  const [menu, setMenu] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auntys-cafe");
        setMenu(res.data.items || []);
      } catch (err) {
        console.error("Error fetching menu", err);
      }
    };
    fetchMenu();
  }, []);

  const handleVote = async (itemName, voteType) => {
    try {
      await axios.post("http://localhost:5000/vote", {
        userId: "demoUser", // Replace with real logged-in user ID
        dishName: itemName,
        vote: voteType
      });
      alert(`${voteType} recorded for ${itemName}`);
    } catch (err) {
      console.error("Vote error", err);
    }
  };

  const handleFeedback = async (itemName) => {
    try {
      const comment = feedbacks[itemName];
      await axios.post("http://localhost:5000/vote", {
        userId: "demoUser", // Replace with real user ID
        dishName: itemName,
        comment: comment
      });
      alert("Feedback submitted!");
    } catch (err) {
      console.error("Feedback error", err);
    }
  };

  return (

    <div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Today’s Special Menu</h2>
        <button onClick={() => navigate("/admin-login")}>Admin Login</button>
      </div>




      {menu.map((item, index) => (
        <div key={index} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <h3>{item.name} - ₹{item.price}</h3>
          <p>{item.veg ? "Veg" : "Non-Veg"} | {item.available ? "Available" : "Unavailable"}</p>

          <button onClick={() => handleVote(item.name, "like")}>👍 Like</button>
          <button onClick={() => handleVote(item.name, "dislike")}>👎 Dislike</button>

          <div>
            <input
              type="text"
              placeholder="Leave feedback..."
              value={feedbacks[item.name] || ""}
              onChange={(e) => {
                setFeedbacks({ ...feedbacks, [item.name]: e.target.value });
              }}
            />
            <button onClick={() => handleFeedback(item.name)}>Submit Feedback</button>
          </div>
        </div>
      ))}
    </div>
  );
}
