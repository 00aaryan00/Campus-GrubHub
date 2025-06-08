import React, { useEffect, useState } from "react";
import axios from "axios";

const Home = () => {
  const [menu, setMenu] = useState({});
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [day, setDay] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/menu").then((res) => {
      setMenu(res.data.menu);
      setVotes(res.data.votes);
      setDay(res.data.day); // assuming backend sends `day` (e.g., Monday)
      setLoading(false);
    });

    axios.get("http://localhost:5000/daily-quote").then((res) => {
      setQuote(res.data.quote);
    });

    axios.get("http://localhost:5000/leaderboard").then((res) => {
      setLeaderboard(res.data);
    });
  }, []);

  const handleVote = (item, type) => {
    axios.post("http://localhost:5000/vote", { item, type }).then((res) => {
      setVotes((prev) => ({
        ...prev,
        [item]: res.data.updated
      }));
    });
  };

  if (loading) return <p className="text-center mt-10 text-lg">Loading menu...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.5rem", color: "#666" }}>
        🗓 {day}
      </h2>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>📅 Today's Mess Menu</h1>

      {/* Daily Quote */}
      <div style={{
        background: "#e0f7fa",
        padding: "1rem 1.5rem",
        borderRadius: "10px",
        marginBottom: "2rem",
        borderLeft: "5px solid #00796b"
      }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#004d40" }}>✨ Quote of the Day</h3>
        <p style={{ fontStyle: "italic", fontSize: "1.1rem" }}>{quote}</p>
      </div>

      {/* Meals and Items */}
      {Object.keys(menu).map((meal) => (
        <div key={meal} style={{
          background: "#f9f9f9",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>{meal.toUpperCase()} 🍽</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {(menu[meal] || []).map((item, i) => (
              <li key={i} style={{
                backgroundColor: "#fff",
                padding: "0.8rem",
                marginBottom: "0.5rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span>🍴 {item}</span>
                <span>
                  <button
                    onClick={() => handleVote(item, "like")}
                    style={{
                      backgroundColor: "#4caf50", color: "white",
                      border: "none", padding: "4px 8px",
                      borderRadius: "5px", marginRight: "6px"
                    }}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleVote(item, "dislike")}
                    style={{
                      backgroundColor: "#f44336", color: "white",
                      border: "none", padding: "4px 8px",
                      borderRadius: "5px"
                    }}
                  >
                    👎
                  </button>
                  <span style={{ marginLeft: "10px" }}>
                    👍 {votes[item]?.like || 0} | 👎 {votes[item]?.dislike || 0}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Weekly Leaderboard */}
      <div style={{
        marginTop: "3rem",
        backgroundColor: "#fff3e0",
        border: "1px solid #ffcc80",
        borderRadius: "10px",
        padding: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#e65100" }}>🏆 Weekly Top Liked Dishes</h2>
        {leaderboard.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <ol style={{ paddingLeft: "1.5rem" }}>
            {leaderboard.map((item, index) => (
              <li key={index} style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                <strong>{item._id}</strong> — {item.count} 👍
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default Home;
