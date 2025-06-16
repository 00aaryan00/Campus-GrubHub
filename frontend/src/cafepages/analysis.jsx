import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { Calendar, TrendingUp, Users, Award, Filter, AlertCircle, RefreshCw } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCzGCo69CAjAQh6C6JfEO79JaQ6vi1vTPk",
  authDomain: "campus-grubhub-9e02c.firebaseapp.com",
  projectId: "campus-grubhub-9e02c",
  storageBucket: "campus-grubhub-9e02c.firebasestorage.app",
  messagingSenderId: "986274538780",
  appId: "1:986274538780:web:3e5ee3ceb9aaccfe1586d9",
  measurementId: "G-RNZDWXCJ61"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const VoteAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [timeRange, setTimeRange] = useState('week');
  const [filterType, setFilterType] = useState('all');
  const [showDebug, setShowDebug] = useState(false);

  // State for Firebase data
  const [voteData, setVoteData] = useState([]);
  const [dishVoteData, setDishVoteData] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Firebase data fetching function
  const fetchFirebaseData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting Firebase data fetch...');

      // Fetch aggregated data from cafeDishVotes collection
      const cafeDishVotesRef = collection(db, 'cafeDishVotes');
      const cafeDishVotesSnapshot = await getDocs(cafeDishVotesRef);
      
      console.log('cafeDishVotes documents:', cafeDishVotesSnapshot.docs.length);
      
      const dishVotes = cafeDishVotesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Dish vote document:', doc.id, data);
        
        return {
          id: doc.id,
          item: doc.id, // The document ID is the item name
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()
        };
      });

      // Fetch individual votes from cafeUserVotes
      const cafeUserVotesRef = collection(db, 'cafeUserVotes');
      const cafeUserVotesSnapshot = await getDocs(cafeUserVotesRef);
      
      console.log('cafeUserVotes documents:', cafeUserVotesSnapshot.docs.length);

      const allVotes = [];
      
      for (const itemDoc of cafeUserVotesSnapshot.docs) {
        const itemData = itemDoc.data();
const comments = itemData.comments || [];
//const itemName = comments[0]?.dishName || 'Unknown Dish';

        
        console.log('User vote document:', itemDoc.id, itemData);
        // Handle different possible data structures
        if (itemData.timestamp && itemData.type && itemData.userName) {
          // Single vote stored directly in document
          allVotes.push({
            id: itemDoc.id,
             item: itemDoc.id,
            type: itemData.type,
            timestamp: itemData.timestamp.toDate ? itemData.timestamp.toDate() : new Date(itemData.timestamp),
            userName: itemData.userName
          });
        } else {
          // If votes are stored as subcollections or arrays, handle them here
          // This is a fallback structure - adjust based on your actual data structure
          // Loop through each vote key (dish ID) in the user vote document
Object.keys(itemData).forEach(key => {
  const voteData = itemData[key];
  if (voteData && typeof voteData === 'object' && voteData.type && voteData.timestamp) {
    allVotes.push({
      id: `${itemDoc.id}_${key}`,
      item: key, // Use the key itself as the dish name
      type: voteData.type,
      timestamp: voteData.timestamp.toDate ? voteData.timestamp.toDate() : new Date(voteData.timestamp),
      userName: voteData.userName || 'Unknown'
    });
  }
});

        }
      }

      // Try to fetch menu data (create empty array if collection doesn't exist)
      let menuItems = [];
      try {
        const menuRef = collection(db, 'menu');
        const menuSnapshot = await getDocs(menuRef);
        menuItems = menuSnapshot.docs.map(doc => ({
          id: doc.id,
          date: doc.id, // Assuming document ID is the date
          ...doc.data()
        }));
        console.log('Menu documents:', menuItems.length);
      } catch (menuError) {
        console.log('Menu collection not found or empty, creating default menu from dish data');
        // Create a default menu entry for today with all available dishes
        const today = new Date().toISOString().split('T')[0];
        const uniqueItems = [...new Set(dishVotes.map(dish => dish.item))];
        
        if (uniqueItems.length > 0) {
          menuItems = [{
            id: today,
            date: today,
            items: uniqueItems
          }];
        }
      }

      console.log('Final data:', {
        votes: allVotes.length,
        dishVotes: dishVotes.length,
        menuItems: menuItems.length
      });

      setVoteData(allVotes);
      setDishVoteData(dishVotes);
      setMenuData(menuItems);
      
      // Set default selected date to the most recent menu date
      if (menuItems.length > 0 && !selectedDate) {
        const sortedMenu = menuItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSelectedDate(sortedMenu[0].date);
      }
      
    } catch (err) {
      console.error('Firebase fetch error:', err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFirebaseData();
  }, []);

  // Filtered data based on time range and filter type
  const getFilteredData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    
    if (timeRange === 'week') start.setDate(now.getDate() - 7);
    if (timeRange === 'month') start.setMonth(now.getMonth() - 1);
    if (timeRange === 'year') start.setFullYear(now.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);

    return voteData.filter(vote => {
      const voteDate = vote.timestamp instanceof Date ? vote.timestamp : new Date(vote.timestamp);
      const afterStart = timeRange === 'all' || voteDate >= start;
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'likes' && vote.type === 'like') || 
        (filterType === 'dislikes' && vote.type === 'dislike');
      
      return afterStart && matchesType;
    });
  }, [voteData, timeRange, filterType]);

  // Calculate vote counts for each item
  const voteCounts = () => {
    const counts = {};
    
    getFilteredData.forEach(vote => {
      const item = (vote.item || '').trim();
      if (!item) return;
      
      if (!counts[item]) {
        counts[item] = { likes: 0, dislikes: 0, total: 0 };
      }
      
      if (vote.type === 'like') counts[item].likes++;
      else if (vote.type === 'dislike') counts[item].dislikes++;
      counts[item].total++;
    });

    return Object.entries(counts).map(([item, { likes, dislikes, total }]) => ({
      item,
      likes,
      dislikes,
      total,
      ratio: total > 0 ? (likes / total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  };

  // Find most liked item
  const mostLiked = () => {
    const counts = voteCounts();
    if (counts.length === 0) return null;
    return counts.reduce((max, current) => current.likes > max.likes ? current : max, counts[0]);
  };

  // Calculate daily trends
  const trends = () => {
    const daily = {};
    
    getFilteredData.forEach(vote => {
      const date = vote.timestamp instanceof Date ? vote.timestamp : new Date(vote.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!daily[dateStr]) {
        daily[dateStr] = { date: dateStr, likes: 0, dislikes: 0 };
      }
      
      if (vote.type === 'like') daily[dateStr].likes++;
      else if (vote.type === 'dislike') daily[dateStr].dislikes++;
    });

    return Object.values(daily).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Calculate totals
  const total = getFilteredData.length;
  const totalLikes = getFilteredData.filter(v => v.type === 'like').length;
  const totalDislikes = getFilteredData.filter(v => v.type === 'dislike').length;

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-lg">Loading data from Firebase...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchFirebaseData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const counts = voteCounts();
  const topItem = mostLiked();
  const dailyTrends = trends();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Aunty's Cafe Analytics</h1>
            <p className="text-gray-600">Real-time customer preferences and voting data 🫖</p>
          </div>
          <button 
            onClick={fetchFirebaseData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh Data
          </button>
        </div>

        {/* Debug Toggle */}
        <div className="mb-4">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
          >
            <AlertCircle size={16} />
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </div>

        {/* Debug Information */}
        {showDebug && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <h3 className="font-bold text-yellow-800 mb-2">Debug Information:</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <p><strong>Total Vote Records:</strong> {voteData.length}</p>
              <p><strong>Filtered Vote Records:</strong> {getFilteredData.length}</p>
              <p><strong>Dish Vote Records:</strong> {dishVoteData.length}</p>
              <p><strong>Menu Records:</strong> {menuData.length}</p>
              <p><strong>Current Time Range:</strong> {timeRange}</p>
              <p><strong>Current Filter Type:</strong> {filterType}</p>
              
              <div className="mt-3">
                <strong>Sample Vote Data:</strong>
                <pre className="bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto max-h-32">
                  {JSON.stringify(voteData.slice(0, 3), null, 2)}
                </pre>
              </div>

              <div className="mt-3">
                <strong>Aggregated Dish Votes:</strong>
                <pre className="bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto max-h-32">
                  {JSON.stringify(dishVoteData.slice(0, 3), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-8 flex flex-wrap gap-4 items-center">
          <Calendar size={20} className="text-gray-600" />
          <select 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Dates</option>
            {menuData
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(menu => (
                <option key={menu.id} value={menu.date}>
                  {formatDate(menu.date)}
                </option>
              ))
            }
          </select>

          <Filter size={20} className="text-gray-600" />
          <select 
            value={timeRange} 
            onChange={e => setTimeRange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>

          <TrendingUp size={20} className="text-gray-600" />
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Votes</option>
            <option value="likes">Likes Only</option>
            <option value="dislikes">Dislikes Only</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Votes</p>
                <h2 className="text-3xl font-bold">{total}</h2>
              </div>
              <Users size={32} className="text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Likes</p>
                <h2 className="text-3xl font-bold text-green-600">{totalLikes}</h2>
              </div>
              <span className="text-green-600 text-3xl">👍</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Dislikes</p>
                <h2 className="text-3xl font-bold text-red-600">{totalDislikes}</h2>
              </div>
              <span className="text-red-600 text-3xl">👎</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Like Rate</p>
                <h2 className="text-3xl font-bold text-purple-600">
                  {total > 0 ? ((totalLikes / total) * 100).toFixed(1) : 0}%
                </h2>
              </div>
              <Award size={32} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Top Item Highlight */}
        {topItem && (
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-6 rounded-lg shadow mb-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏆</span>
              <div>
                <h2 className="text-2xl font-bold">Most Popular: {topItem.item}</h2>
                <p className="text-orange-100">
                  {topItem.likes} likes • {topItem.dislikes} dislikes • {topItem.ratio.toFixed(1)}% positive
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Votes per Item Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Votes per Item</h3>
            {counts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={counts.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="item" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="likes" fill="#22c55e" name="Likes" />
                  <Bar dataKey="dislikes" fill="#ef4444" name="Dislikes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No voting data available
              </div>
            )}
          </div>

          {/* Popular Items Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Popular Items Distribution</h3>
            {counts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={counts.slice(0, 6)} 
                    dataKey="total" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100}
                    label={({ item, percent }) => `${item} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {counts.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.item]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No voting data available
              </div>
            )}
          </div>
        </div>

        {/* Daily Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-semibold mb-4">Daily Voting Trends</h3>
          {dailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={date => new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={date => new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                />
                <Line type="monotone" dataKey="likes" stroke="#22c55e" name="Likes" strokeWidth={2} />
                <Line type="monotone" dataKey="dislikes" stroke="#ef4444" name="Dislikes" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Aggregated Dish Statistics */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-semibold mb-4">Aggregated Dish Statistics</h3>
          {dishVoteData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dishVoteData.map((dish) => (
                <div key={dish.id} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-lg mb-3">{dish.item}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-600">👍 Likes:</span>
                      <span className="font-semibold">{dish.likes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">👎 Dislikes:</span>
                      <span className="font-semibold">{dish.dislikes}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">📊 Total:</span>
                      <span className="font-semibold">{dish.likes + dish.dislikes}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Last Updated: {dish.lastUpdated.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No aggregated dish data available</p>
          )}
        </div>

        {/* Menu Items for Selected Date */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">
            Menu Items {selectedDate && `for ${formatDate(selectedDate)}`}
          </h3>
          
          {selectedDate && menuData.find(m => m.date === selectedDate)?.items ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuData.find(m => m.date === selectedDate).items.map((item, index) => {
                const voteStats = counts.find(v => v.item.toLowerCase() === item.toLowerCase());
                const dishStats = dishVoteData.find(d => d.item.toLowerCase() === item.toLowerCase());
                
                return (
                  <div key={index} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-lg mb-2">{item}</h4>
                    
                    {voteStats ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          👍 {voteStats.likes} • 👎 {voteStats.dislikes} • {voteStats.ratio.toFixed(1)}% positive
                        </p>
                        {dishStats && (
                          <p className="text-xs text-gray-500">
                            Aggregated: {dishStats.likes}👍 {dishStats.dislikes}👎
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No votes recorded yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {selectedDate ? 'No menu items found for selected date' : 'Select a date to view menu items'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteAnalytics;