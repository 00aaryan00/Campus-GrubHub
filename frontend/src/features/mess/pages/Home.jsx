import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../shared/api/axiosConfig";
import { auth } from "../../../shared/config/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import "../styles/Home.css";

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
  const isLoadingRef = useRef(false); // Prevent concurrent API calls
  const dataCacheRef = useRef(dataCache); // Keep ref in sync with state
  const dayRef = useRef(day); // Keep ref in sync with state
  const hasInitializedRef = useRef(false); // Track if we've done initial load
  const authProcessingRef = useRef(false); // Prevent multiple auth state processing
  const lastSaveUserRef = useRef(null); // Track last save-user call time
  const saveUserCooldown = 30000; // 30 seconds cooldown for save-user
  const saveUserTimeoutRef = useRef(null);
  const latestLoadRequestRef = useRef(0);
  const lastVoteMutationAtRef = useRef(0);
  const latestSecondaryLoadRequestRef = useRef(0);
  const voteRequestIdsRef = useRef({});

  // Keep refs in sync with state
  useEffect(() => {
    dataCacheRef.current = dataCache;
  }, [dataCache]);

  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  useEffect(() => {
    return () => {
      if (saveUserTimeoutRef.current) {
        clearTimeout(saveUserTimeoutRef.current);
      }
    };
  }, []);

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
    async (forceRegular = false, forceRefresh = false, authTokenOverride = authToken) => {
      // Prevent concurrent calls
      if (isLoadingRef.current && !forceRefresh) {
        console.log("Skipping loadInitialData - already loading");
        return;
      }

      try {
        isLoadingRef.current = true;
        const now = Date.now();
        const requestId = ++latestLoadRequestRef.current;
        
        // Check cache using refs to get latest values without causing dependency issues
        const currentCache = dataCacheRef.current;
        const currentDay = dayRef.current;
        const shouldUseCache =
          !forceRefresh &&
          currentCache.lastUpdated &&
          now - currentCache.lastUpdated < currentCache.cacheDuration &&
          currentCache.lastVoteDay === currentDay;

        if (shouldUseCache && !forceRegular) {
          isLoadingRef.current = false;
          return;
        }

        setLoading(true);
        setError(null);

        const [menuResponse, userVotesResponse] = await Promise.allSettled([
          axiosInstance.get("/menu"),
          authTokenOverride
            ? axiosInstance.get("/user-votes", {
                headers: { Authorization: `Bearer ${authTokenOverride}` },
              })
            : Promise.resolve({ data: {} }),
        ]);

        if (menuResponse.status !== "fulfilled") {
          throw menuResponse.reason;
        }

        if (authTokenOverride && userVotesResponse.status !== "fulfilled") {
          throw userVotesResponse.reason;
        }

        const menuPayload = menuResponse.value?.data || {};
        const menuData = menuPayload.menu || {
          breakfast: [],
          lunch: [],
          snacks: [],
          dinner: [],
        };
        const votesData = menuPayload.votes || {};
        const dayData = menuPayload.day || "";
        const hasNewerVoteMutation = lastVoteMutationAtRef.current > now;

        if (requestId !== latestLoadRequestRef.current) {
          return;
        }

        setDataCache((prev) => {
          if (prev.lastVoteDay !== dayData) {
            setUserVotes({});
          }
          return {
            ...prev,
            lastUpdated: now,
            lastVoteDay: dayData,
          };
        });

        setMenu(menuData);
        setDay(dayData);
        setError(null);

        if (!hasNewerVoteMutation) {
          setVotes(votesData);
        }

        if (!hasNewerVoteMutation && userVotesResponse.status === "fulfilled" && userVotesResponse.value.data) {
          setUserVotes(userVotesResponse.value.data);
        }

        const secondaryRequestId = ++latestSecondaryLoadRequestRef.current;
        void (async () => {
          const [quoteResponse, leaderboardResponse] = await Promise.allSettled([
            axiosInstance.get("/daily-quote"),
            axiosInstance.get("/leaderboard"),
          ]);

          if (
            requestId !== latestLoadRequestRef.current ||
            secondaryRequestId !== latestSecondaryLoadRequestRef.current
          ) {
            return;
          }

          if (quoteResponse.status === "fulfilled") {
            setQuote(quoteResponse.value.data?.quote || "");
          }

          if (leaderboardResponse.status === "fulfilled") {
            setLeaderboard(leaderboardResponse.value.data || []);
          }
        })().catch((secondaryError) => {
          console.error("Error loading secondary data:", secondaryError);
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setError(`Failed to load menu: ${error.message}`);
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
        isLoadingRef.current = false;
      }
    },
    [authToken] // Removed dataCache and day from dependencies to prevent recreation loop
  );

  const debouncedLoadInitialData = useMemo(() => debounce(loadInitialData, 1000), [loadInitialData]);

  useEffect(() => {
    let isMounted = true;
    let lastAuthState = null;

    // onAuthStateChanged fires immediately when set up, so it handles initial load
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      const authStateKey = currentUser ? currentUser.uid : null;
      
      // Skip if same auth state AND we've already initialized (prevents duplicate calls)
      if (lastAuthState === authStateKey && hasInitializedRef.current) {
        return;
      }
      
      // Prevent processing if already processing
      if (authProcessingRef.current) {
        console.log("Auth state change already processing, skipping...");
        return;
      }
      
      authProcessingRef.current = true;
      lastAuthState = authStateKey;

      try {
        if (currentUser) {
          setUser(currentUser);
          const token = await currentUser.getIdToken();
          setAuthToken(token);

          // Only call save-user if we haven't initialized yet AND cooldown has passed
          const now = Date.now();
          const shouldCallSaveUser = 
            !hasInitializedRef.current && 
            (!lastSaveUserRef.current || (now - lastSaveUserRef.current) > saveUserCooldown);
          
          if (shouldCallSaveUser) {
            // Delay this non-critical request so it doesn't compete with first paint data.
            if (saveUserTimeoutRef.current) {
              clearTimeout(saveUserTimeoutRef.current);
            }
            saveUserTimeoutRef.current = setTimeout(() => {
              axiosInstance.post(
                "/save-user",
                {},
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              ).catch((error) => {
                if (error.response?.status !== 429) {
                  console.error("Error saving user (non-critical):", error.message);
                }
              });
            }, 1500);
            lastSaveUserRef.current = now;
          }

          await loadInitialData(true, false, token);
          hasInitializedRef.current = true;
        } else {
          // User logged out - still need to load menu for non-authenticated view
          setUser(null);
          setAuthToken(null);
          setUserVotes({});
          await loadInitialData(true, false, null);
          hasInitializedRef.current = true;
        }
      } catch (error) {
        console.error("Error setting up user:", error);
        setError("Failed to initialize user data");
      } finally {
        authProcessingRef.current = false;
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadInitialData]);

  const handleVoteClick = async (item, type) => {
    if (!user || !authToken || processingVotes[item]) return;

    const requestId = (voteRequestIdsRef.current[item] || 0) + 1;
    voteRequestIdsRef.current[item] = requestId;

    const previousVote = userVotes[item];
    const previousVotes = votes[item] || { like: 0, dislike: 0 };
    const optimisticVotes = { ...previousVotes };
    const optimisticUserVotes = { ...userVotes };
    const intendedType = previousVote === type ? "neutral" : type;

    if (previousVote) {
      optimisticVotes[previousVote] = Math.max(0, (optimisticVotes[previousVote] || 0) - 1);
    }
    if (intendedType !== "neutral") {
      optimisticVotes[intendedType] = (optimisticVotes[intendedType] || 0) + 1;
      optimisticUserVotes[item] = intendedType;
    } else {
      delete optimisticUserVotes[item];
    }

    setProcessingVotes((prev) => ({ ...prev, [item]: true }));
    setError(null);
    lastVoteMutationAtRef.current = Date.now();
    setVotes((prev) => ({ ...prev, [item]: optimisticVotes }));
    setUserVotes(optimisticUserVotes);

    const sendVoteRequest = async (attempt = 0) => {
      try {
        const response = await axiosInstance.post(
          "/vote",
          { item, type: intendedType, day, timestamp: Date.now() },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (voteRequestIdsRef.current[item] !== requestId) {
          return;
        }

        if (!response.data.success) {
          throw new Error("Vote not recorded");
        }

        setVotes((prev) => ({
          ...prev,
          [item]: response.data.votes || prev[item],
        }));
        setUserVotes(response.data.userVotes || optimisticUserVotes);
      } catch (error) {
        if (voteRequestIdsRef.current[item] !== requestId) {
          return;
        }

        console.error("Vote error:", error);
        if (attempt < 2) {
          setTimeout(() => {
            if (voteRequestIdsRef.current[item] === requestId) {
              void sendVoteRequest(attempt + 1);
            }
          }, 1000);
          return;
        }

        setVotes((prev) => ({ ...prev, [item]: previousVotes }));
        setUserVotes((prev) => {
          const restoredVotes = { ...prev };
          if (previousVote) {
            restoredVotes[item] = previousVote;
          } else {
            delete restoredVotes[item];
          }
          return restoredVotes;
        });
        debouncedLoadInitialData(true, true);
        setError("Failed to record vote after retries. Data refreshed.");
      } finally {
        if (voteRequestIdsRef.current[item] === requestId) {
          setProcessingVotes((prev) => ({ ...prev, [item]: false }));
        }
      }
    };

    await sendVoteRequest();
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

  // REMOVED: Initial load useEffect - onAuthStateChanged handles ALL loading
  // This prevents race conditions where both effects try to load simultaneously

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
