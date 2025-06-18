import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Award, Filter, AlertCircle, RefreshCw, Search, Coffee, Heart, ThumbsDown, Star, Calendar, Trophy } from 'lucide-react';

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

// Updated cafe theme colors for pie chart with more variety
const PIE_COLORS = ['#8B4513', '#DAA520', '#CD853F', '#D2691E', '#B8860B', '#A0522D', '#DEB887', '#F4A460', '#BC8F8F', '#C19A6B'];

const VoteAnalytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [filterType, setFilterType] = useState('all');
  
  const [searchTerm, setSearchTerm] = useState('');

  // State for Firebase data
  const [voteData, setVoteData] = useState([]);
  const [dishVoteData, setDishVoteData] = useState([]);
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

      console.log('Final data:', {
        votes: allVotes.length,
        dishVotes: dishVotes.length
      });

      setVoteData(allVotes);
      setDishVoteData(dishVotes);
      
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

  // Loading state with cafe theme
  if (loading) {
    return (
      <div className="cafe-container initial-loading">
        <div className="loading-card">
          <div className="loading-spinner-small"></div>
          <p className="processing-text">Brewing your analytics...</p>
        </div>
      </div>
    );
  }

  // Error state with cafe theme
  if (error) {
    return (
      <div className="cafe-container initial-loading">
        <div className="menu-item-card" style={{maxWidth: '500px'}}>
          <div className="text-center">
            <AlertCircle size={48} style={{color: '#8B4513', margin: '0 auto 1rem'}} />
            <h2 className="item-name" style={{marginBottom: '1rem'}}>Oops! Something went wrong</h2>
            <p style={{color: '#6b7280', marginBottom: '1.5rem'}}>{error}</p>
            <button 
              onClick={fetchFirebaseData}
              className="order-button"
              style={{position: 'static', transform: 'none'}}
            >
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const counts = voteCounts();
  const topItem = mostLiked();
  const dailyTrends = trends();

  return (
    <div className="cafe-container">
      {/* Smaller Header */}
      <div className="cafe-header" style={{padding: '2rem 0'}}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Coffee size={32} className="text-white" />
            <h1 className="text-3xl font-bold text-white">Aunty's Cafe Analytics</h1>
            <Coffee size={32} className="text-white" />
          </div>
          <p className="text-lg text-orange-100 mb-4">Discover what our customers love most ☕</p>
          
          <div className="flex justify-center gap-3">
            <button 
              onClick={fetchFirebaseData}
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white text-sm"
              disabled={loading}
            >
              <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={14} />
              Refresh Data
            </button>
               
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
       

        {/* Filters */}
        <div className="menu-item-card mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={20} style={{color: '#8B4513'}} />
              <select 
                value={timeRange} 
                onChange={e => setTimeRange(e.target.value)}
                className="feedback-input"
                style={{minWidth: '150px'}}
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={20} style={{color: '#8B4513'}} />
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
                className="feedback-input"
                style={{minWidth: '150px'}}
              >
                <option value="all">All Votes</option>
                <option value="likes">Likes Only</option>
                <option value="dislikes">Dislikes Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="menu-item-card text-center">
            <Users size={32} style={{color: '#8B4513', margin: '0 auto 1rem'}} />
            <h3 style={{color: '#6B7280', marginBottom: '0.5rem'}}>Total Votes</h3>
            <div className="item-price" style={{margin: 0}}>{total}</div>
          </div>
          
          <div className="menu-item-card text-center">
            <Heart size={32} style={{color: '#16a34a', margin: '0 auto 1rem'}} />
            <h3 style={{color: '#6B7280', marginBottom: '0.5rem'}}>Total Likes</h3>
            <div className="item-price" style={{margin: 0, color: '#16a34a'}}>{totalLikes}</div>
          </div>
          
          <div className="menu-item-card text-center">
            <ThumbsDown size={32} style={{color: '#dc2626', margin: '0 auto 1rem'}} />
            <h3 style={{color: '#6B7280', marginBottom: '0.5rem'}}>Total Dislikes</h3>
            <div className="item-price" style={{margin: 0, color: '#dc2626'}}>{totalDislikes}</div>
          </div>
          
          <div className="menu-item-card text-center">
            <Award size={32} style={{color: '#DAA520', margin: '0 auto 1rem'}} />
            <h3 style={{color: '#6B7280', marginBottom: '0.5rem'}}>Like Rate</h3>
            <div className="item-price" style={{margin: 0, color: '#DAA520'}}>
              {total > 0 ? ((totalLikes / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Top Item Highlight */}
        {topItem && (
          <div className="menu-item-card mb-8" style={{
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #CD853F 100%)',
            color: 'white',
            borderLeft: '4px solid #DAA520'
          }}>
            <div className="flex items-center gap-4">
              <Trophy size={48} style={{color: '#DAA520'}} />
              <div>
                <h2 className="item-name" style={{color: 'white', marginBottom: '0.5rem'}}>
                  🏆 Most Popular: {topItem.item}
                </h2>
                <p style={{color: '#fed7aa', fontSize: '1.1rem'}}>
                  {topItem.likes} likes • {topItem.dislikes} dislikes • {topItem.ratio.toFixed(1)}% positive
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Votes per Item Chart */}
          <div className="menu-item-card">
            <h3 className="item-name mb-4">📊 Votes per Item</h3>
            {counts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={counts.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DEB887" />
                  <XAxis 
                    dataKey="item" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                    stroke="#8B4513"
                  />
                  <YAxis stroke="#8B4513" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '2px solid #8B4513',
                      borderRadius: '0.75rem',
                      color: '#8B4513'
                    }}
                  />
                  <Bar dataKey="likes" fill="#16a34a" name="Likes" />
                  <Bar dataKey="dislikes" fill="#dc2626" name="Dislikes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{height: '300px'}}>
                <div className="empty-icon">📈</div>
                <div className="empty-title">No voting data available</div>
              </div>
            )}
          </div>

          {/* Popular Items Pie Chart with varied colors */}
          <div className="menu-item-card">
            <h3 className="item-name mb-4">🥧 Popular Items Distribution</h3>
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
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [value, props.payload.item]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '2px solid #8B4513',
                      borderRadius: '0.75rem',
                      color: '#8B4513'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{height: '300px'}}>
                <div className="empty-icon">🥧</div>
                <div className="empty-title">No distribution data available</div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Trends Chart */}
        <div className="menu-item-card mb-8">
          <h3 className="item-name mb-4">📈 Daily Voting Trends</h3>
          {dailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DEB887" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={date => new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  stroke="#8B4513"
                />
                <YAxis stroke="#8B4513" />
                <Tooltip 
                  labelFormatter={date => new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #8B4513',
                    borderRadius: '0.75rem',
                    color: '#8B4513'
                  }}
                />
                <Line type="monotone" dataKey="likes" stroke="#16a34a" name="Likes" strokeWidth={3} />
                <Line type="monotone" dataKey="dislikes" stroke="#dc2626" name="Dislikes" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{height: '300px'}}>
              <div className="empty-icon">📈</div>
              <div className="empty-title">No trend data available</div>
            </div>
          )}
        </div>

        {/* Filtered Items Overview */}
        <div className="menu-item-card mb-8">
          <h3 className="item-name mb-6">☕ Filtered Items Overview ({timeRange})</h3>
          
          {counts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {counts.map((item, index) => {
                const dishStats = dishVoteData.find(d => d.item.toLowerCase() === item.item.toLowerCase());
                
                return (
                  <div key={index} className="p-4 rounded-lg border-2 border-amber-200" style={{
                    background: 'linear-gradient(135deg, #FFF8DC 0%, #FFFACD 100%)'
                  }}>
                    <h4 className="font-bold text-amber-800 text-lg mb-3 truncate" title={item.item}>{item.item}</h4>
                    
                    <div className="space-y-2">
                      <div className="text-sm text-amber-700 font-semibold">Current Period:</div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600">👍 {item.likes}</span>
                        <span className="text-red-600">👎 {item.dislikes}</span>
                        <span className="text-yellow-600">{item.ratio.toFixed(1)}% ❤️</span>
                      </div>
                      
                      {dishStats && (
                        <>
                          <div className="border-t border-amber-300 pt-2 mt-2">
                            <div className="text-xs text-amber-700 font-semibold mb-1">All-time:</div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-green-600">👍 {dishStats.likes}</span>
                              <span className="text-red-600">👎 {dishStats.dislikes}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">☕</div>
              <div className="empty-title">No items found</div>
              <div className="empty-subtitle">
                No cafe items have votes in the selected time range. Try expanding your filter!
              </div>
            </div>
          )}
        </div>

        {/* All-Time Dish Statistics with Search */}
        <div className="menu-item-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="item-name">🍽️ All-Time Dish Statistics</h3>
            <div className="flex items-center gap-2">
              <Search size={20} style={{color: '#8B4513'}} />
              <input
                type="text"
                placeholder="Search dishes..."
                className="feedback-input"
                style={{minWidth: '200px'}}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {dishVoteData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dishVoteData
                .filter(dish => 
                  dish.item.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes))
                .map((dish) => (
                <div key={dish.id} className="p-4 rounded-lg border-2 border-amber-200" style={{
                  background: 'linear-gradient(135deg, #FFF8DC 0%, #FFFACD 100%)'
                }}>
                  <h4 className="font-bold text-amber-800 text-lg mb-3 truncate" title={dish.item}>{dish.item}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-600 font-semibold text-sm">👍 Likes:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">{dish.likes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 font-semibold text-sm">👎 Dislikes:</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">{dish.dislikes}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-amber-300 pt-2">
                      <span className="text-amber-700 font-semibold text-sm">📊 Total:</span>
                      <span className="font-bold text-amber-800">{dish.likes + dish.dislikes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-600 font-semibold text-sm">📈 Like Rate:</span>
                      <span className="font-bold text-yellow-700">
                        {dish.likes + dish.dislikes > 0 
                          ? ((dish.likes / (dish.likes + dish.dislikes)) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 border-t border-amber-200 pt-2">
                      Last Updated: {dish.lastUpdated.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <div className="empty-title">No dish statistics available</div>
              <div className="empty-subtitle">Start voting to see analytics here!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteAnalytics;