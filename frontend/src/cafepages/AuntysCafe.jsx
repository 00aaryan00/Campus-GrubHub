import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AuntysCafe() {
  const [menu, setMenu] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const navigate = useNavigate();
  const userId = "demoUser"; // Replace with real user login if available

  useEffect(() => {
    const fetchData = async () => {
      try {
        const menuRes = await axios.get("http://localhost:5000/auntys-cafe/menu");
        const votesRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
        const userVoteRes = await axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`);

        setMenu(menuRes.data.items || []);
        setVotes(votesRes.data.votes || {});
        setUserVotes(userVoteRes.data.votes || {});
      } catch (err) {
        console.error("Error fetching data", err);
      }
    };
    fetchData();
  }, []);

  const handleVote = async (itemName, voteType) => {
    try {
      await axios.post("http://localhost:5000/auntys-cafe/vote", {
        userId,
        dishName: itemName.replace(/\//g, "_"),
        vote: voteType,
      });
      alert(`${voteType} recorded for ${itemName}`);

      // Refresh userVotes and vote counts
      const voteRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
      const userVoteRes = await axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`);
      setVotes(voteRes.data.votes || {});
      setUserVotes(userVoteRes.data.votes || {});
    } catch (err) {
      alert(err.response?.data?.error || "Error voting");
      console.error("Vote error", err);
    }
  };

  const handleFeedback = async (itemName) => {
    try {
      const comment = feedbacks[itemName];
      if (!comment) {
        alert("Please enter a comment.");
        return;
      }

      await axios.post("http://localhost:5000/auntys-cafe/feedback", {
        userId,
        dishName: itemName.replace(/\//g, "_"),
        comment,
      });
      alert("Feedback submitted!");
      setFeedbacks({ ...feedbacks, [itemName]: "" });

      // Refresh feedbacks
      const voteRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
      setVotes(voteRes.data.votes || {});
    } catch (err) {
      console.error("Feedback error", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Today’s Special Menu</h2>
        <button onClick={() => navigate("/admin-login")}>Admin Login</button>
      </div>

      {menu.length === 0 && <p>No items available currently.</p>}

      {menu.map((item, index) => {
        const dishId = item.name.replace(/\//g, "_");
        const userHasVoted = !!userVotes[dishId];
        const dishVotes = votes[dishId] || { likes: 0, dislikes: 0, comments: [] };

        return (
          <div key={index} style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            margin: "10px 0",
            padding: "15px",
            backgroundColor: "#f9f9f9"
          }}>
            <h3>{item.name} - ₹{item.price}</h3>
            <p>{item.veg ? "Veg" : "Non-Veg"} | {item.available ? "Available" : "Unavailable"}</p>

            <p>
              👍 {dishVotes.likes} &nbsp;&nbsp;
              👎 {dishVotes.dislikes}
            </p>

            <div style={{ marginBottom: "10px" }}>
              <button
                onClick={() => handleVote(item.name, "like")}
                disabled={userHasVoted}
                style={{ marginRight: "10px" }}
              >
                👍 Like
              </button>
              <button
                onClick={() => handleVote(item.name, "dislike")}
                disabled={userHasVoted}
              >
                👎 Dislike
              </button>
              {userHasVoted && <span style={{ marginLeft: "10px", color: "green" }}>You already voted</span>}
            </div>

            <div>
              <input
                type="text"
                placeholder="Leave feedback..."
                value={feedbacks[item.name] || ""}
                onChange={(e) => {
                  setFeedbacks({ ...feedbacks, [item.name]: e.target.value });
                }}
                style={{ width: "60%", marginRight: "10px" }}
              />
              <button onClick={() => handleFeedback(item.name)}>Submit Feedback</button>
            </div>

            {/* 📜 Display all feedbacks */}
            <div style={{ marginTop: "10px", fontStyle: "italic" }}>
              <strong>Feedbacks:</strong>
              {Array.isArray(dishVotes.comments) && dishVotes.comments.length > 0 ? (
  <ul style={{ paddingLeft: "20px" }}>
    {dishVotes.comments.map((c, idx) => (
      <li key={idx}>{c.comment}</li>
    ))}
  </ul>
) : (
  <p>No feedback yet.</p>
)}

            </div>
          </div>
        );
      })}
    </div>
  );
}
