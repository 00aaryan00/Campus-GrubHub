import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import "./Home.css";

const Home = () => {
  const [menu, setMenu] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [day, setDay] = useState("");
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [processingVotes, setProcessingVotes] = useState({});
  const [dataCache, setDataCache] = useState({
    lastUpdated: null,
    cacheDuration: 5 * 60 * 1000,
    lastVoteDay: null,
  });
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [floatingIcons, setFloatingIcons] = useState([]);

  // Debounce utility to prevent rapid API calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Function to add a new floating icon
  const addFloatingIcon = useCallback(() => {
    const icons = ["👍", "👎", "🧀", "🥦", "🥪", "🍰", "🍕", "🍔"];
    const newIcon = {
      id: Math.random().toString(36).substr(2, 9),
      icon: icons[Math.floor(Math.random() * icons.length)],
      left: `${Math.random() * 90 + 5}%`,
      rotation: `${Math.random() * 360}deg`,
    };
    setFloatingIcons((prev) => [...prev, newIcon]);
    setTimeout(() => {
      setFloatingIcons((prev) => prev.filter((icon) => icon.id !== newIcon.id));
    }, 2000);
  }, []);

  // Set up interval to add floating icons
  useEffect(() => {
    const interval = setInterval(addFloatingIcon, 1000);
    return () => clearInterval(interval);
  }, [addFloatingIcon]);

  const loadInitialData = useCallback(
    async (forceRegular = false, forceRefresh = false) => {
      try {
        const now = Date.now();
        const shouldUseCache =
          !forceRefresh &&
          dataCache.lastUpdated &&
          now - dataCache.lastUpdated < dataCache.cacheDuration &&
          dataCache.lastVoteDay === day;

        if (shouldUseCache && !forceRegular) return;

        setLoading(true);
        setError(null);

        const [menuResponse, quoteResponse, leaderboardResponse, userVotesResponse] = await Promise.all([
          axiosInstance.get("/menu"),
          axiosInstance.get("/daily-quote"),
          axiosInstance.get("/leaderboard"),
          authToken
            ? axiosInstance.get("/user-votes", {
                headers: { Authorization: `Bearer ${authToken}` },
              })
            : Promise.resolve({ data: {} }),
        ]);

        const menuData = menuResponse.data?.menu || {
          breakfast: [],
          lunch: [],
          snacks: [],
          dinner: [],
        };
        const votesData = menuResponse.data?.votes || {};
        const dayData = menuResponse.data?.day || "";

        if (dataCache.lastVoteDay !== dayData) {
          setUserVotes({});
        }

        setMenu(menuData);
        setVotes(votesData);
        setDay(dayData);
        setQuote(quoteResponse.data?.quote || "");
        setLeaderboard(leaderboardResponse.data || []);
        setDataCache((prev) => ({
          ...prev,
          lastUpdated: now,
          lastVoteDay: dayData,
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
    },
    [authToken, dataCache.lastVoteDay, day]
  );

  const debouncedLoadInitialData = useCallback(debounce(loadInitialData, 1000), [loadInitialData]);

  useEffect(() => {
    let isMounted = true;
    let lastAuthState = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      const authStateKey = currentUser ? currentUser.uid : null;
      if (lastAuthState === authStateKey) return;
      lastAuthState = authStateKey;

      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken(true);
          setAuthToken(token);

          await axiosInstance.post(
            "/save-user",
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          await loadInitialData(true);
        } catch (error) {
          console.error("Error setting up user:", error);
          setError("Failed to initialize user data");
        }
      } else {
        setUser(null);
        setAuthToken(null);
        setUserVotes({});
        await loadInitialData(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadInitialData]);

  const handleVoteClick = async (item, type, retryCount = 0) => {
    if (!user || !authToken || processingVotes[item]) return;

    setProcessingVotes((prev) => ({ ...prev, [item]: true }));
    setError(null);

    try {
      const previousVote = userVotes[item];
      const previousVotes = votes[item] || { like: 0, dislike: 0 };
      const newVotes = { ...previousVotes };
      const newUserVotes = { ...userVotes };

      const newType = userVotes[item] === type ? "neutral" : type;

      if (previousVote) {
        newVotes[previousVote] = Math.max(0, (newVotes[previousVote] || 0) - 1);
      }
      if (newType !== "neutral") {
        newVotes[newType] = (newVotes[newType] || 0) + 1;
        newUserVotes[item] = newType;
      } else {
        delete newUserVotes[item];
      }

      setVotes((prev) => ({ ...prev, [item]: newVotes }));
      setUserVotes(newUserVotes);

      const response = await axiosInstance.post(
        "/vote",
        { item, type, day, timestamp: Date.now() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.success) {
        setVotes((prev) => ({
          ...prev,
          [item]: response.data.votes || prev[item],
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
        debouncedLoadInitialData(true);
        setError("Failed to record vote after retries. Data refreshed.");
      }
    } finally {
      setProcessingVotes((prev) => ({ ...prev, [item]: false }));
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        alert("Logged out successfully!");
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Logout failed", error);
        setError("Logout failed. Please try again.");
      });
  };

  const handleManualRefresh = async () => {
    await debouncedLoadInitialData(true, true);
  };

  useEffect(() => {
    debouncedLoadInitialData();
  }, [debouncedLoadInitialData]);

  if (loading && isInitialLoad) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Campus GrubHub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="app-icon">🍽️</div>
            <h1 className="app-title">Campus GrubHub</h1>
          </div>

          {user && (
            <div className="user-info">
              <img
                src={user.photoURL || "https://via.placeholder.com/40"}
                alt="Profile"
                className="user-avatar"
              />
              <span className="user-name">{user.displayName || "User"}</span>
            </div>
          )}
        </div>
        {/* Floating Icons */}
        {floatingIcons.map((icon) => (
          <span
            key={icon.id}
            className="floating-icon"
            style={{
              left: icon.left,
              bottom: "10px",
              "--random-rotation": icon.rotation,
            }}
          >
            {icon.icon}
          </span>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Error Message */}
        {error && (
          <div className="error-card">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <div className="error-details">
                <h3 className="error-title">Oops! Something went wrong</h3>
                <p className="error-message">{error}</p>
                <button
                  onClick={handleManualRefresh}
                  className="error-refresh-btn"
                >
                  🔄 Refresh Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Actions Panel */}
        {user && (
          <div className="user-panel">
            <div className="user-panel-content">
              <div className="user-welcome">
                <img
                  src={user.photoURL || "https://via.placeholder.com/60"}
                  alt="User Profile"
                  className="user-profile-pic"
                />
                <div>
                  <h3 className="welcome-text">
                    Welcome back, {user.displayName || "User"}! 👋
                  </h3>
                  <p className="user-email">{user.email}</p>
                </div>
              </div>

              <div className="action-buttons">
                <Link to="/stats" className="action-link">
                  <button className="stats-btn">📊 View Stats</button>
                </Link>
                <Link to="/auntys-cafe" className="action-link">
                  <button className="cafe-btn">☕ Aunty's Cafe</button>
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  🚪 Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date and Title */}
        <div className="page-header">
          <h2 className="page-date">🗓 {day || "Loading..."}</h2>
          <h1 className="page-title">📅 Mess Menu</h1>
        </div>

        {/* Loading Indicator */}
        {loading && !isInitialLoad && (
          <div className="updating-indicator">
            <div className="updating-spinner"></div>
            <span className="updating-text">Updating...</span>
          </div>
        )}

        {/* Daily Quote */}
        <div className="quote-card">
          <h3 className="quote-title">✨ Daily Inspiration</h3>
          <p className="quote-text">
            "{quote || "Loading your daily dose of inspiration..."}"
          </p>
        </div>

        {/* Menu Sections */}
        {Object.keys(menu).length === 0 && !loading ? (
          <div className="no-menu-card">
            <p className="no-menu-text">No menu data available at the moment.</p>
          </div>
        ) : (
          Object.keys(menu).map((meal) => (
            <div key={meal} className="meal-section">
              <h2 className="meal-title">{meal.toUpperCase()} 🍽</h2>
              <ul className="menu-list">
                {(menu[meal] || []).map((item, i) => {
                  const userVoted = userVotes[item];
                  const isProcessing = processingVotes[item];

                  return (
                    <li key={i} className="menu-item">
                      <span className="item-name">🍴 {item}</span>
                      <div className="vote-section">
                        <button
                          onClick={() => handleVoteClick(item, "like")}
                          className={`vote-btn like-btn ${
                            userVoted === "like" ? "voted" : ""
                          }`}
                          disabled={!user || isProcessing}
                        >
                          {isProcessing ? "⌛" : "👍"}
                        </button>
                        <button
                          onClick={() => handleVoteClick(item, "dislike")}
                          className={`vote-btn dislike-btn ${
                            userVoted === "dislike" ? "voted" : ""
                          }`}
                          disabled={!user || isProcessing}
                        >
                          {isProcessing ? "⌛" : "👎"}
                        </button>
                        <span className="vote-count">
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

        {/* Leaderboard */}
        <div className="leaderboard-card">
          <h2 className="leaderboard-title">🏆 Community Leaderboard</h2>
          {leaderboard.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboard.map(({ _id, count }, i) => (
                <div
                  key={i}
                  className={`leaderboard-item ${i < 3 ? "top-three" : ""}`}
                >
                  <span className="rank">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="leaderboard-name">{_id}</span>
                  <span className="vote-count-leader">{count} votes</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-leaderboard-text">
              No voting data available yet. Be the first to vote!
            </p>
          )}
        </div>
      </div>

      {/* Global Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-icon">🍽️</div>
            <h3 className="footer-title">Campus GrubHub</h3>
          </div>
          <p className="footer-text">
            © 2025 Campus GrubHub Team. All rights reserved.
          </p>
          <span>
            <a href="/About" className="underline text-green-950 hover:text-white">
              About Us
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Home;