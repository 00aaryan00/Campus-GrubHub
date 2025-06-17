import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const [menu, setMenu] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(false); // Start with false to avoid initial flicker
  const [quote, setQuote] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [day, setDay] = useState("");
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [processingVotes, setProcessingVotes] = useState({});
  const [dataCache, setDataCache] = useState({
    lastUpdated: null,
    cacheDuration: 5 * 60 * 1000, // 5 minutes cache
    lastVoteDay: null
  });
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load

  // Debounce utility to prevent rapid API calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const loadInitialData = useCallback(async (forceRegular = false,forceRefresh = false) => {
    try {
      const now = Date.now();
      const shouldUseCache = !forceRefresh && 
                           dataCache.lastUpdated && 
                           (now - dataCache.lastUpdated < dataCache.cacheDuration) &&
                           dataCache.lastVoteDay === day;
      
      if (shouldUseCache && !forceRegular) return;

      setLoading(true);
      setError(null);
      
      const [menuResponse, quoteResponse, leaderboardResponse, userVotesResponse] = await Promise.all([
        axios.get("http://localhost:5000/menu"),
        axios.get("http://localhost:5000/daily-quote"),
        axios.get("http://localhost:5000/leaderboard"),
        authToken ? axios.get("http://localhost:5000/user-votes", {
          headers: { Authorization: `Bearer ${authToken}` }
        }) : Promise.resolve({ data: {} })
      ]);

      const menuData = menuResponse.data?.menu || {
        breakfast: [],
        lunch: [],
        snacks: [],
        dinner: []
      };
      const votesData = menuResponse.data?.votes || {};
      const dayData = menuResponse.data?.day || "";

      // Reset user votes if the day has changed
      if (dataCache.lastVoteDay !== dayData) {
        setUserVotes({});
      }

      setMenu(menuData);
      setVotes(votesData);
      setDay(dayData);
      setQuote(quoteResponse.data?.quote || "");
      setLeaderboard(leaderboardResponse.data || []);
      setDataCache(prev => ({ 
        ...prev, 
        lastUpdated: now,
        lastVoteDay: dayData 
      }));
      if (userVotesResponse.data) {
        setUserVotes(userVotesResponse.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError(`Failed to load menu: ${error.message}`);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [authToken, dataCache.lastVoteDay]); // Removed day from dependencies

  // Debounced version of loadInitialData
  const debouncedLoadInitialData = useCallback(debounce(loadInitialData, 500), [loadInitialData]);

  useEffect(() => {
    let isMounted = true;
    let lastAuthState = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      // Avoid redundant calls if auth state hasn't changed
      const authStateKey = currentUser ? currentUser.uid : null;
      if (lastAuthState === authStateKey) return;
      lastAuthState = authStateKey;

      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken(true);
          setAuthToken(token);
          
          await axios.post("http://localhost:5000/save-user", {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Only force refresh on initial login
          await loadInitialData(true);
        } catch (error) {
          console.error("Error setting up user:", error);
          setError("Failed to initialize user data");
        }
      } else {
        setUser(null);
        setAuthToken(null);
        setUserVotes({});
        await loadInitialData(true); // Force refresh on logout
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadInitialData]);

  const handleVoteClick = async (item, type, retryCount = 0) => {
    if (!user || !authToken || processingVotes[item]) return;
    
    setProcessingVotes(prev => ({ ...prev, [item]: true }));
    setError(null);

    try {
      // Optimistic UI update
      const previousVote = userVotes[item];
      const previousVotes = votes[item] || { like: 0, dislike: 0 };
      const newVotes = { ...previousVotes };
      const newUserVotes = { ...userVotes };

      const newType = userVotes[item] === type ? 'neutral' : type;

      if (previousVote) {
        newVotes[previousVote] = Math.max(0, (newVotes[previousVote] || 0) - 1);
      }
      if (newType !== 'neutral') {
        newVotes[newType] = (newVotes[newType] || 0) + 1;
        newUserVotes[item] = newType;
      } else {
        delete newUserVotes[item];
      }

      setVotes(prev => ({ ...prev, [item]: newVotes }));
      setUserVotes(newUserVotes);

      const response = await axios.post(
        "http://localhost:5000/vote",
        { item, type, day, timestamp: Date.now() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.success) {
        setVotes(prev => ({
          ...prev,
          [item]: response.data.votes || prev[item]
        }));
        setUserVotes(response.data.userVotes || newUserVotes);
      } else {
        throw new Error("Vote not recorded");
      }
    } catch (error) {
      console.error("Vote error:", error);
      if (retryCount < 2) {
        setTimeout(() => handleVoteClick(item, type, retryCount + 1), 1000);
      } else {
        // Use debounced load to avoid rapid refreshes
        debouncedLoadInitialData(true);
        setError("Failed to record vote after retries. Data refreshed.");
      }
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
        setError("Logout failed. Please try again.");
      });
  };

  const handleManualRefresh = async () => {
    await debouncedLoadInitialData(true);
  };

  // Initial load on mount
  useEffect(() => {
    debouncedLoadInitialData();
  }, [debouncedLoadInitialData]);

  if (loading && isInitialLoad) {
    return <p className="text-center mt-10 text-lg">Loading menu...</p>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      {error && (
        <div style={{ background: "#ffebee", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <p style={{ color: "#c62828" }}>{error}</p>
          <button
            onClick={handleManualRefresh}
            style={{
              backgroundColor: "#1976d2",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "0.5rem"
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      )}

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
              src={user.photoURL || "https://via.placeholder.com/50"}
              alt="User"
              style={{ width: "50px", height: "50px", borderRadius: "50%", marginRight: "1rem" }}
            />
            <div>
              <h3 style={{ margin: 0 }}>{user.displayName || "User"}</h3>
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
        🗓 {day || "Loading..."}
      </h2>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        📅 Today's Mess Menu
      </h1>

      {loading && !isInitialLoad && (
        <div style={{ position: "absolute", top: "10px", right: "10px", color: "#666" }}>
          🔄 Updating...
        </div>
      )}

      <div style={{
        background: "#e0f7fa",
        padding: "1rem 1.5rem",
        borderRadius: "10px",
        marginBottom: "2rem",
        borderLeft: "5px solid #00796b"
      }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#004d40" }}>
          ✨ Quote of the Day
        </h3>
        <p style={{ fontStyle: "italic", fontSize: "1.1rem" }}>{quote || "Loading quote..."}</p>
      </div>

      {Object.keys(menu).length === 0 && !loading ? (
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
        <h2 style={{ fontSize: "1.5rem", color: "#33691e", marginBottom: "0.5rem" }}>
          🏆 Leaderboard
        </h2>
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