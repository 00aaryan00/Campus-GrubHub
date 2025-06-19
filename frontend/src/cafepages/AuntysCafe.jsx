import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import "./AuntysCafe.css";

export default function AuntysCafe() {
  const [menu, setMenu] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [activeTab, setActiveTab] = useState("menu");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuRes, votesRes, userVoteRes] = await Promise.all([
          axios.get("http://localhost:5000/auntys-cafe/menu"),
          axios.get("http://localhost:5000/auntys-cafe/dish-votes"),
          axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`),
        ]);

        setMenu(menuRes.data.items || []);
        setVotes(votesRes.data.votes || {});
        setUserVotes(userVoteRes.data.votes || {});
      } catch (err) {
        console.error("Error fetching data", err);
        alert("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleVote = async (itemName, dishId, voteType) => {
    if (!userId) {
      alert("Please log in to vote");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/auntys-cafe/vote", {
        userId,
        dishName: itemName,
        dishId: dishId || null, // Fallback to null if dishId is missing
        vote: voteType,
      });

      if (response.data.success) {
        const [votesRes, userVoteRes] = await Promise.all([
          axios.get("http://localhost:5000/auntys-cafe/dish-votes"),
          axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`),
        ]);

        setVotes(votesRes.data.votes || {});
        setUserVotes(userVoteRes.data.votes || {});
        alert("Vote submitted successfully!");
      } else {
        throw new Error(response.data.error || "Voting failed");
      }
    } catch (err) {
      console.error("Vote error:", err);
      alert(err.response?.data?.error || err.message || "Error voting");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (itemName, dishId) => {
    if (!userId) {
      alert("Please log in to submit feedback");
      return;
    }

    try {
      const comment = feedbacks[itemName];
      if (!comment || comment.trim() === "") {
        alert("Please enter a valid comment.");
        return;
      }

      setLoading(true);
      const response = await axios.post("http://localhost:5000/auntys-cafe/feedback", {
        userId,
        dishName: itemName,
        dishId: dishId || null, // Fallback to null if dishId is missing
        comment: comment.trim(),
      });

      if (response.data.success) {
        alert("Feedback submitted successfully!");
        setFeedbacks({ ...feedbacks, [itemName]: "" });
        const voteRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
        setVotes(voteRes.data.votes || {});
      } else {
        throw new Error(response.data.error || "Feedback submission failed");
      }
    } catch (err) {
      console.error("Feedback error:", err);
      alert(err.response?.data?.error || err.message || "Error submitting feedback");
    } finally {
      setLoading(false);
    }
  };

  const normalizeDocId = (name) => {
    return name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    if (typeof timestamp === "string") {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
  };

  if (loading && menu.length === 0) {
    return (
      <div className="initial-loading">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cafe-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner-small"></div>
            <span className="processing-text">Processing...</span>
          </div>
        </div>
      )}

      <div className="floating-buttons">
        <Link to="/auntys-cafe/preorder">
          <button className="order-button">
            <span className="mr-2">🛒</span>
            Order Now
          </button>
        </Link>
        <Link to="/my-orders">
          <button className="orders-button">
            <span className="mr-2">📋</span>
            Your Orders
          </button>
        </Link>
      </div>

      <div className="cafe-header">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="cafe-title">☕ Aunty's Cafe</h1>
            <p className="cafe-subtitle">Today's Special Menu - Homemade goodness, served with love</p>
          </div>
          <div className="header-buttons">
            <button onClick={() => navigate("/analytics")} className="header-button">
              📊 View Stats
            </button>
            <button onClick={() => navigate("/admin-login")} className="header-button">
              👤 Admin Login
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="tab-container">
          <div className="tab-wrapper">
            <button
              className={`tab-button ${activeTab === "menu" ? "tab-active" : "tab-inactive"}`}
              onClick={() => setActiveTab("menu")}
            >
              🍽️ Menu Items
            </button>
            <button
              className={`tab-button ${activeTab === "feedback" ? "tab-active" : "tab-inactive"}`}
              onClick={() => setActiveTab("feedback")}
            >
              💬 All Feedback
            </button>
          </div>
        </div>

        {activeTab === "menu" ? (
          <div className="menu-grid">
            {menu.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">☕</div>
                <p className="empty-title">No items available currently.</p>
                <p className="empty-subtitle">Please check back later for our delicious offerings!</p>
              </div>
            )}

            {menu.map((item, index) => {
              const dishId = normalizeDocId(item.name);
              const userHasVoted = !!userVotes[dishId];
              const dishVotes = votes[dishId] || { likes: 0, dislikes: 0, currentComments: [], pastComments: [] };

              return (
                <div key={index} className="menu-item-card">
                  <div className="menu-item-header">
                    <div>
                      <h3 className="item-name">{item.name}</h3>
                      <div className="item-price">₹{item.price}</div>
                      <div className="item-tags">
                        <span className={`tag ${item.veg ? "tag-veg" : "tag-non-veg"}`}>
                          {item.veg ? "🥬 Veg" : "🍖 Non-Veg"}
                        </span>
                        <span className={`tag ${item.available ? "tag-available" : "tag-unavailable"}`}>
                          {item.available ? "✅ Available" : "❌ Sold Out"}
                        </span>
                      </div>
                    </div>
                    <div className="votes-display">
                      <div className="vote-stats">
                        <span className="like-count">
                          <span className="mr-1">👍</span> {dishVotes.likes}
                        </span>
                        <span className="dislike-count">
                          <span className="mr-1">👎</span> {dishVotes.dislikes}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="voting-buttons">
                    <button
                      onClick={() => handleVote(item.name, item.dishId, "like")}
                      disabled={userHasVoted || loading}
                      className={`vote-button ${userHasVoted || loading ? "vote-disabled" : "vote-like"}`}
                    >
                      👍 {userHasVoted && userVotes[dishId]?.type === "like" ? "Liked" : "Like"}
                    </button>
                    <button
                      onClick={() => handleVote(item.name, item.dishId, "dislike")}
                      disabled={userHasVoted || loading}
                      className={`vote-button ${userHasVoted || loading ? "vote-disabled" : "vote-dislike"}`}
                    >
                      👎 {userHasVoted && userVotes[dishId]?.type === "dislike" ? "Disliked" : "Dislike"}
                    </button>
                  </div>

                  <div className="feedback-input-container">
                    <div className="feedback-input-wrapper">
                      <input
                        type="text"
                        placeholder="Share your thoughts about this dish..."
                        value={feedbacks[item.name] || ""}
                        onChange={(e) => setFeedbacks({ ...feedbacks, [item.name]: e.target.value })}
                        disabled={loading}
                        className="feedback-input"
                      />
                      <button
                        onClick={() => handleFeedback(item.name, item.dishId)}
                        disabled={loading || !feedbacks[item.name]?.trim()}
                        className="feedback-submit"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {(dishVotes.currentComments?.length > 0 || dishVotes.pastComments?.length > 0) && (
                    <div>
                      <h4 className="comments-title">
                        <span className="mr-2">💭</span>
                        Recent Feedback:
                      </h4>
                      <div className="comments-container">
                        {dishVotes.currentComments
                          .sort((a, b) => {
                            const aTime = new Date(a.timestamp || 0);
                            const bTime = new Date(b.timestamp || 0);
                            return bTime - aTime;
                          })
                          .slice(0, 3)
                          .map((commentObj, idx) => (
                            <div key={`current-${commentObj.userId}-${idx}`} className="comment-card">
                              <p className="comment-text">"{commentObj.comment}"</p>
                              <p className="comment-meta">
                                — {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} •{" "}
                                {formatTimestamp(commentObj.timestamp)}
                              </p>
                            </div>
                          ))}
                        {dishVotes.pastComments?.length > 0 && (
                          <>
                            <hr className="border-t-2 border-gray-400 my-2" />
                            <h5 className="text-sm font-bold mb-2">Previous Reviews:</h5>
                            {dishVotes.pastComments
                              .sort((a, b) => {
                                const aTime = new Date(a.timestamp || 0);
                                const bTime = new Date(b.timestamp || 0);
                                return bTime - aTime;
                              })
                              .slice(0, 3)
                              .map((commentObj, idx) => (
                                <div key={`past-${commentObj.userId}-${idx}`} className="comment-card">
                                  <p className="comment-text">"{commentObj.comment}"</p>
                                  <p className="comment-meta">
                                    — {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} •{" "}
                                    {formatTimestamp(commentObj.timestamp)}
                                  </p>
                                </div>
                              ))}
                          </>
                        )}
                      </div>
                      {(dishVotes.currentComments.length > 3 || dishVotes.pastComments.length > 3) && (
                        <button onClick={() => setActiveTab("feedback")} className="view-all-button">
                          View all {dishVotes.currentComments.length + dishVotes.pastComments.length} feedbacks →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="feedback-section">
            <div className="feedback-container">
              <h2 className="feedback-title">
                <span className="mr-3">💬</span>
                All Customer Feedback
              </h2>

              {menu.length === 0 ? (
                <div className="empty-feedback-state">
                  <div className="empty-icon">☕</div>
                  <p className="empty-title">No menu items available to show feedback.</p>
                  <p className="empty-subtitle">Please check back later!</p>
                </div>
              ) : (
                <div className="feedback-items">
                  {menu
                    .filter((item) => {
                      const dishVotes = votes[normalizeDocId(item.name)] || {
                        currentComments: [],
                        pastComments: [],
                      };
                      return dishVotes.currentComments?.length > 0 || dishVotes.pastComments?.length > 0;
                    })
                    .map((item) => {
                      const dishVotes = votes[normalizeDocId(item.name)] || {
                        currentComments: [],
                        pastComments: [],
                      };
                      const allComments = [...dishVotes.currentComments, ...dishVotes.pastComments];
                      return (
                        <div key={item.name} className="feedback-item">
                          <h3 className="feedback-dish-name">
                            {item.name}
                            <span className="feedback-count">
                              ({allComments.length} feedback{allComments.length !== 1 ? "s" : ""})
                            </span>
                          </h3>
                          <div className="feedback-comments">
                            {dishVotes.currentComments
                              .sort((a, b) => {
                                const aTime = new Date(a.timestamp || 0);
                                const bTime = new Date(b.timestamp || 0);
                                return bTime - aTime;
                              })
                              .map((commentObj, idx) => (
                                <div key={`current-${commentObj.userId}-${idx}`} className="feedback-comment-card">
                                  <p className="feedback-comment-text">"{commentObj.comment}"</p>
                                  <p className="feedback-comment-meta">
                                    — {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} •{" "}
                                    {formatTimestamp(commentObj.timestamp)}
                                  </p>
                                </div>
                              ))}
                            {dishVotes.pastComments?.length > 0 && (
                              <>
                                <hr className="border-t-2 border-gray-400 my-2" />
                                <h5 className="text-sm font-bold mb-2">Previous Reviews:</h5>
                                {dishVotes.pastComments
                                  .sort((a, b) => {
                                    const aTime = new Date(a.timestamp || 0);
                                    const bTime = new Date(b.timestamp || 0);
                                    return bTime - aTime;
                                  })
                                  .map((commentObj, idx) => (
                                    <div key={`past-${commentObj.userId}-${idx}`} className="feedback-comment-card">
                                      <p className="feedback-comment-text">"{commentObj.comment}"</p>
                                      <p className="feedback-comment-meta">
                                        — {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} •{" "}
                                        {formatTimestamp(commentObj.timestamp)}
                                      </p>
                                    </div>
                                  ))}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {menu.filter((item) => {
                    const dishVotes = votes[normalizeDocId(item.name)] || { currentComments: [], pastComments: [] };
                    return dishVotes.currentComments?.length > 0 || dishVotes.pastComments?.length > 0;
                  }).length === 0 && (
                    <div className="no-feedback-state">
                      <div className="empty-icon">☕</div>
                      <p className="empty-title">No feedback available yet!</p>
                      <p className="empty-subtitle">Be the first to share your thoughts about our delicious food.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}