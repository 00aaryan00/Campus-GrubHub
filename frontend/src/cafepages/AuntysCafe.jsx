import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

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
          axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`)
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

  const handleVote = async (itemName, voteType) => {
    if (!userId) {
      alert("Please log in to vote");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/auntys-cafe/vote", {
        userId,
        dishName: itemName,
        vote: voteType,
      });

      if (response.data.success) {
        // Refresh data after successful vote
        const [votesRes, userVoteRes] = await Promise.all([
          axios.get("http://localhost:5000/auntys-cafe/dish-votes"),
          axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`)
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

  const handleFeedback = async (itemName) => {
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
        comment: comment.trim()
      });

      if (response.data.success) {
        alert("Feedback submitted successfully!");
        setFeedbacks({ ...feedbacks, [itemName]: "" });

        // Refresh feedback data
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
  
  // Handle Firebase Timestamp objects
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString();
  }
  
  // Handle ISO string timestamps
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
  }
  
  // Handle regular date objects
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
};

  if (loading && menu.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Overlay - Fixed z-index and visibility */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-10 right-4 space-y-2 z-10">
        <Link to="/auntys-cafe/preorder">
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center">
            <span>Order Now</span>
          </button>
        </Link>
        <Link to="/my-orders">
          <button className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-4 py-2 rounded-full shadow-lg flex items-center">
            <span>Your Orders</span>
          </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Today's Special Menu</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate("/analytics")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              📊 View Stats
            </button>
            <button
              onClick={() => navigate("/admin-login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Admin Login
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'menu' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('menu')}
          >
            Menu Items
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'feedback' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('feedback')}
          >
            All Feedback
          </button>
        </div>

        {activeTab === 'menu' ? (
          <div className="grid gap-6">
            {menu.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items available currently.
              </div>
            )}

            {menu.map((item, index) => {
              const dishId = normalizeDocId(item.name);
              const userHasVoted = !!userVotes[dishId];
              const dishVotes = votes[dishId] || { likes: 0, dislikes: 0, comments: [] };

              return (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {item.name} - ₹{item.price}
                      </h3>
                      <div className="flex items-center mt-1 space-x-2 text-sm">
                        <span className={`px-2 py-1 rounded-full ${item.veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.veg ? "Veg" : "Non-Veg"}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${item.available ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.available ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">👍 {dishVotes.likes}</span>
                      <span className="text-red-600">👎 {dishVotes.dislikes}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleVote(item.name, "like")}
                      disabled={userHasVoted || loading}
                      className={`px-3 py-1 rounded ${userHasVoted || loading ? 'bg-gray-200 cursor-not-allowed' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                    >
                      👍 {userHasVoted && userVotes[dishId]?.type === 'like' ? 'Liked' : 'Like'}
                    </button>
                    <button
                      onClick={() => handleVote(item.name, "dislike")}
                      disabled={userHasVoted || loading}
                      className={`px-3 py-1 rounded ${userHasVoted || loading ? 'bg-gray-200 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                    >
                      👎 {userHasVoted && userVotes[dishId]?.type === 'dislike' ? 'Disliked' : 'Dislike'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Leave your feedback..."
                        value={feedbacks[item.name] || ""}
                        onChange={(e) => setFeedbacks({ ...feedbacks, [item.name]: e.target.value })}
                        disabled={loading}
                        className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <button
                        onClick={() => handleFeedback(item.name)}
                        disabled={loading || !feedbacks[item.name]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg disabled:bg-gray-400"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {dishVotes.comments?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Recent Feedback:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {dishVotes.comments
                          .sort((a, b) => {
                            const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                            const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                            return bTime - aTime;
                          })
                          .slice(0, 3)
                          .map((commentObj, idx) => (
                            <div key={`${commentObj.userId}-${idx}`} className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-gray-800 italic">"{commentObj.comment}"</p>
                              <p className="text-xs text-gray-500 mt-1">
                                - {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} • {formatTimestamp(commentObj.timestamp)}
                              </p>
                            </div>
                          ))}
                      </div>
                      {dishVotes.comments.length > 3 && (
                        <button
                          onClick={() => setActiveTab('feedback')}
                          className="text-blue-600 text-sm mt-2 hover:underline"
                        >
                          View all {dishVotes.comments.length} feedbacks
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">All Feedback</h2>
            {menu.length === 0 ? (
              <p className="text-gray-500">No menu items available to show feedback.</p>
            ) : (
              <div className="space-y-6">
                {menu
                  .filter(item => {
                    const dishVotes = votes[normalizeDocId(item.name)] || { comments: [] };
                    return dishVotes.comments?.length > 0;
                  })
                  .map((item) => {
                    const dishVotes = votes[normalizeDocId(item.name)] || { comments: [] };
                    return (
                      <div key={item.name} className="border-b pb-4 last:border-b-0">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {item.name} ({dishVotes.comments.length} feedback{dishVotes.comments.length !== 1 ? 's' : ''})
                        </h3>
                        <div className="space-y-3">
                          {dishVotes.comments
                            .sort((a, b) => {
                              const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                              const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                              return bTime - aTime;
                            })
                            .map((commentObj, idx) => (
                              <div key={`${commentObj.userId}-${idx}`} className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-gray-800">"{commentObj.comment}"</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  - {commentObj.userName || `User ${commentObj.userId.substring(0, 8)}...`} • {formatTimestamp(commentObj.timestamp)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                {menu.filter(item => {
                  const dishVotes = votes[normalizeDocId(item.name)] || { comments: [] };
                  return dishVotes.comments?.length > 0;
                }).length === 0 && (
                  <p className="text-gray-500 text-center py-8">No feedback available yet. Be the first to leave feedback!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}