import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const [menu, setMenu] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [day, setDay] = useState("");
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);

          await axios.post("http://localhost:5000/save-user", {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const userVotesResponse = await axios.get("http://localhost:5000/user-votes", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserVotes(userVotesResponse.data);
        } catch (error) {
          console.error("Error setting up user:", error);
        }
      } else {
        setUser(null);
        setAuthToken(null);
        setUserVotes({});
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user !== undefined) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [menuResponse, quoteResponse, leaderboardResponse] = await Promise.all([
        axios.get("http://localhost:5000/menu"),
        axios.get("http://localhost:5000/daily-quote"),
        axios.get("http://localhost:5000/leaderboard")
      ]);

      const menuData = menuResponse.data?.menu || {
        breakfast: [],
        lunch: [],
        snacks: [],
        dinner: []
      };
      const votesData = menuResponse.data?.votes || {};
      const dayData = menuResponse.data?.day || "";

      setMenu(menuData);
      setVotes(votesData);
      setDay(dayData);
      setQuote(quoteResponse.data?.quote || "");
      setLeaderboard(leaderboardResponse.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (item, type) => {
    if (!user || !authToken) {
      alert("Please log in to vote!");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/vote",
        { item, type },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.success) {
        setVotes(prev => ({
          ...prev,
          [item]: response.data.updated
        }));

        setUserVotes(prev => ({
          ...prev,
          [item]: response.data.userVote
        }));
      }
    } catch (error) {
      console.error("Vote error:", error);
      alert("Failed to record vote. Please try again.");
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        alert("Logged out!");
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Logout failed", error);
      });
  };

  if (loading) return <p className="text-center mt-10 text-lg">Loading menu...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      {user && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f1f1f1",
          borderRadius: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={user.photoURL}
              alt="User"
              style={{ width: "50px", height: "50px", borderRadius: "50%", marginRight: "1rem" }}
            />
            <div>
              <h3 style={{ margin: 0 }}>{user.displayName}</h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>{user.email}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link to="/stats">
              <button style={{
                backgroundColor: "#1976d2",
                color: "white",
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}>
                📊 View Stats
              </button>
            </Link>

            <Link to="/auntys-cafe">
              <button style={{
                backgroundColor: "#1976d2",
                color: "white",
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}>
                Aunty's Cafe
              </button>
            </Link>


            <button onClick={handleLogout} style={{
              backgroundColor: "#d32f2f",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}>
              Logout
            </button>
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: "0.5rem", color: "#666" }}>
        🗓 {day}
      </h2>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>📅 Today's Mess Menu</h1>

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

      {Object.keys(menu).length === 0 ? (
        <p>No menu data available.</p>
      ) : (
        Object.keys(menu).map((meal) => (
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
              {(menu[meal] || []).map((item, i) => {
                const userVoted = userVotes[item];
                return (
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
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => handleVote(item, "like")}
                        style={{
                          backgroundColor: userVoted === "like" ? "#2e7d32" : "#4caf50",
                          color: "white",
                          border: userVoted === "like" ? "2px solid #1b5e20" : "none",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          cursor: user ? "pointer" : "not-allowed",
                          opacity: user ? 1 : 0.6
                        }}
                        disabled={!user}
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleVote(item, "dislike")}
                        style={{
                          backgroundColor: userVoted === "dislike" ? "#c62828" : "#f44336",
                          color: "white",
                          border: userVoted === "dislike" ? "2px solid #b71c1c" : "none",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          cursor: user ? "pointer" : "not-allowed",
                          opacity: user ? 1 : 0.6
                        }}
                        disabled={!user}
                      >
                        👎
                      </button>
                      <span>
                        👍 {votes[item]?.like || 0} | 👎 {votes[item]?.dislike || 0}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      <div style={{
        background: "#f1f8e9",
        padding: "1rem 1.5rem",
        borderRadius: "10px",
        marginTop: "2rem",
        borderLeft: "5px solid #689f38"
      }}>
        <h2 style={{ fontSize: "1.5rem", color: "#33691e", marginBottom: "0.5rem" }}>🏆 Leaderboard</h2>
        <ol>
          {leaderboard.map(({ _id, count }, i) => (
            <li key={i}>
              {_id}: {count} votes
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default Home;
