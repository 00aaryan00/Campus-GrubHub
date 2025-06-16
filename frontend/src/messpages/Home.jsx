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
  const [processingVotes, setProcessingVotes] = useState({});
  const [dataCache, setDataCache] = useState({
    lastUpdated: null,
    cacheDuration: 5 * 60 * 1000 // 5 minutes cache
  });

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
          
          await loadInitialData();
          
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

  const loadInitialData = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      const shouldUseCache = !forceRefresh && 
                           dataCache.lastUpdated && 
                           (now - dataCache.lastUpdated < dataCache.cacheDuration);
      
      if (shouldUseCache) return;

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
      setDataCache(prev => ({ ...prev, lastUpdated: now }));
    } catch (error) {
      console.error("Error loading data:", error);
      alert(`Failed to load menu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteClick = async (item, type) => {
  if (!user || !authToken || processingVotes[item]) return;
  
  // Determine if this is a vote toggle (clicking same button again)
  const newType = userVotes[item] === type ? 'neutral' : type;
  
  setProcessingVotes(prev => ({ ...prev, [item]: true }));

  try {
    // Optimistic UI update
    const previousVote = userVotes[item];
    const previousVotes = votes[item] || { like: 0, dislike: 0 };
    const newVotes = { ...previousVotes };
    const newUserVotes = { ...userVotes };

    // Remove previous vote if exists
    if (previousVote) {
      newVotes[previousVote] -= 1;
    }

    // Add new vote if not neutral
    if (newType !== 'neutral') {
      newVotes[newType] += 1;
      newUserVotes[item] = newType;
    } else {
      delete newUserVotes[item];
    }

    setVotes(prev => ({ ...prev, [item]: newVotes }));
    setUserVotes(newUserVotes);

    // Send to server - note we send the original type, not newType
    const response = await axios.post(
      "http://localhost:5000/vote",
      { item, type }, // Send original type, not newType
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // Verify server response
    if (!response.data.success) {
      await loadInitialData(true);
    }
  } catch (error) {
    console.error("Vote error:", error);
    await loadInitialData(true);
  } finally {
    setProcessingVotes(prev => ({ ...prev, [item]: false }));
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
                const isProcessing = processingVotes[item];
                
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
                        onClick={() => handleVoteClick(item, "like")}
                        style={{
                          backgroundColor: userVoted === "like" ? "#2e7d32" : "#4caf50",
                          color: "white",
                          border: userVoted === "like" ? "2px solid #1b5e20" : "none",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          cursor: user && !isProcessing ? "pointer" : "not-allowed",
                          opacity: user ? (isProcessing ? 0.7 : 1) : 0.6
                        }}
                        disabled={!user || isProcessing}
                      >
                        {isProcessing ? "⌛" : "👍"}
                      </button>
                      <button
                        onClick={() => handleVoteClick(item, "dislike")}
                        style={{
                          backgroundColor: userVoted === "dislike" ? "#c62828" : "#f44336",
                          color: "white",
                          border: userVoted === "dislike" ? "2px solid #b71c1c" : "none",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          cursor: user && !isProcessing ? "pointer" : "not-allowed",
                          opacity: user ? (isProcessing ? 0.7 : 1) : 0.6
                        }}
                        disabled={!user || isProcessing}
                      >
                        {isProcessing ? "⌛" : "👎"}
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