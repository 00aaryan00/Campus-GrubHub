import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase"; // Adjust the path as per your project

export default function AuntysCafe() {
  const [menu, setMenu] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [activeTab, setActiveTab] = useState("menu"); // 'menu' or 'feedback'
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);  // automatically get userId from Firebase
      } else {
        navigate("/login"); // redirect to login if not logged in
      }
    });

    return () => unsubscribe(); // cleanup listener on unmount
  }, [navigate]);






  useEffect(() => {
    if (!userId) return; // Don't fetch until userId is set

    const fetchData = async () => {
      try {
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
      }
    };

    fetchData();
  }, [userId]);


  // ... [keep your existing handleVote and handleFeedback functions]
  // const handleVote = async (itemName, voteType) => {
  //   try {
  //     await axios.post("http://localhost:5000/auntys-cafe/vote", {
  //       userId,
  //       dishName: itemName.replace(/\//g, "_"),
  //       vote: voteType,
  //     });

  //     // Refresh votes after successful vote
  //     const [votesRes, userVoteRes] = await Promise.all([
  //       axios.get("http://localhost:5000/auntys-cafe/dish-votes"),
  //       axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`)
  //     ]);

  //     setVotes(votesRes.data.votes || {});
  //     setUserVotes(userVoteRes.data.votes || {});
  //   } catch (err) {
  //     console.error("Vote error:", err);
  //     alert(err.response?.data?.error || "Error voting");
  //   }
  // }; 


  const handleVote = async (itemName, voteType) => {
    try {
      const response = await axios.post("http://localhost:5000/auntys-cafe/vote", {
        userId, // Now using real user ID
        dishName: itemName.replace(/\//g, "_"),
        vote: voteType,
      });

      if (response.data.success) {
        // Refresh data
        const [votesRes, userVoteRes] = await Promise.all([
          axios.get("http://localhost:5000/auntys-cafe/dish-votes"),
          axios.get(`http://localhost:5000/auntys-cafe/user-votes/${userId}`)
        ]);

        setVotes(votesRes.data.votes || {});
        setUserVotes(userVoteRes.data.votes || {});
      } else {
        throw new Error(response.data.error || "Voting failed");
      }
    } catch (err) {
      console.error("Vote error:", err);
      alert(err.response?.data?.error || err.message || "Error voting");
    }
  };

  // Update handleFeedback to include user info
  const handleFeedback = async (itemName) => {
    try {
      const comment = feedbacks[itemName];

      if (!comment || comment.trim() === "") {
        alert("Please enter a valid comment.");
        return;
      }

      const response = await axios.post("http://localhost:5000/auntys-cafe/feedback", {
        userId, // Now using real user ID
        dishName: itemName,
        comment: comment.trim()
      });

      if (response.data.success) {
        alert("Feedback submitted successfully!");
        setFeedbacks({ ...feedbacks, [itemName]: "" });

        // Refresh feedback
        const voteRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
        setVotes(voteRes.data.votes || {});
      } else {
        throw new Error(response.data.error || "Feedback submission failed");
      }
    } catch (err) {
      console.error("Feedback error:", err);
      alert(err.response?.data?.error || err.message || "Error submitting feedback");
    }
  };



  // const handleFeedback = async (itemName) => {
  //   try {
  //     const comment = feedbacks[itemName];

  //     // Validate input
  //     if (!comment || comment.trim() === "") {
  //       alert("Please enter a valid comment.");
  //       return;
  //     }

  //     if (!itemName) {
  //       throw new Error("Dish name is missing");
  //     }

  //     const response = await axios.post("http://localhost:5000/auntys-cafe/feedback", {
  //       userId: userId,
  //       dishName: itemName,
  //       comment: comment.trim()
  //     });

  //     if (response.data.success) {
  //       alert("Feedback submitted successfully!");
  //       setFeedbacks({ ...feedbacks, [itemName]: "" });

  //       // Refresh feedbacks
  //       const voteRes = await axios.get("http://localhost:5000/auntys-cafe/dish-votes");
  //       setVotes(voteRes.data.votes || {});
  //     } else {
  //       throw new Error(response.data.error || "Failed to submit feedback");
  //     }
  //   } catch (err) {
  //     console.error("Feedback Submission Error:", err);
  //     const errorMessage = err.response?.data?.error ||
  //       err.message ||
  //       "Failed to submit feedback";
  //     alert(`Error: ${errorMessage}`);
  //   }
  // };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Action Buttons */}
      <div className="fixed bottom-10 right-4 space-y-2 z-10">
        <Link to="/auntys-cafe/preorder">
          <button className="bg-green-500 hover:bg-green-600  text-white px-4 py-2 rounded-full shadow-lg flex items-center">
            <span>Order Now</span>

          </button>
        </Link>
        <Link to="/my-orders">
          <button className="bg-yellow-400 hover:bg-yellow-500  text-gray-800 px-4 py-2 rounded-full shadow-lg flex items-center">
            <span>Your Orders</span>

          </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Today's Special Menu</h1>
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
                      disabled={userHasVoted}
                      className={`px-3 py-1 rounded ${userHasVoted ? 'bg-gray-200 cursor-not-allowed' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                    >
                      👍 Like
                    </button>
                    <button
                      onClick={() => handleVote(item.name, "dislike")}
                      disabled={userHasVoted}
                      className={`px-3 py-1 rounded ${userHasVoted ? 'bg-gray-200 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                    >
                      👎 Dislike
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Leave your feedback..."
                        value={feedbacks[item.name] || ""}
                        onChange={(e) => setFeedbacks({ ...feedbacks, [item.name]: e.target.value })}
                        className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleFeedback(item.name)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {dishVotes.comments?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Recent Feedback:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {dishVotes.comments.slice(0, 3).map((commentObj, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-800 italic">"{commentObj.comment}"</p>
                            <p className="text-xs text-gray-500 mt-1">
                              - User {commentObj.userId} • {new Date(commentObj.timestamp).toLocaleString()}
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
                {menu.map((item) => {
                  const dishVotes = votes[normalizeDocId(item.name)] || { comments: [] };
                  return dishVotes.comments?.length > 0 ? (
                    <div key={item.name} className="border-b pb-4 last:border-b-0">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {item.name} ({dishVotes.comments.length} feedbacks)
                      </h3>
                      <div className="space-y-3">
                        {dishVotes.comments.map((commentObj, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-800">"{commentObj.comment}"</p>
                            <p className="text-xs text-gray-500 mt-1">
                              - User {commentObj.userId} • {new Date(commentObj.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeDocId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
}