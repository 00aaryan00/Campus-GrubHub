import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Users, Award, Filter } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Stats.css';

const fetchVoteData = async () => {
  try {
    const votesRef = collection(db, 'userVotes');
    const snapshot = await getDocs(votesRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('📊 Fetched vote data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching vote data:', error);
    return [];
  }
};

const fetchMenuData = async () => {
  try {
    const menuRef = collection(db, 'menu');
    const snapshot = await getDocs(menuRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('🍽️ Fetched menu data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching menu data:', error);
    return [];
  }
};

const COLORS = ['#4CAF50', '#FF5722', '#FFC107', '#03A9F4', '#8BC34A'];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const VoteAnalytics = () => {
  const [selectedDay, setSelectedDay] = useState('');
  const [timeRange, setTimeRange] = useState('week');
  const [filterType, setFilterType] = useState('all');
  const [voteData, setVoteData] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [votes, menu] = await Promise.all([
          fetchVoteData(),
          fetchMenuData()
        ]);
        
        setVoteData(votes);
        setMenuData(menu);
        
        // Set default selected day to today
        const today = new Date();
        const todayDay = DAYS_OF_WEEK[today.getDay()];
        setSelectedDay(todayDay);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please check your Firebase configuration.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper function to get day of week from timestamp
  const getDayFromTimestamp = (timestamp) => {
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp) {
      date = new Date(timestamp);
    } else {
      return null;
    }
    return DAYS_OF_WEEK[date.getDay()];
  };

  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date();
    
    // Handle time range filter
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return voteData.filter(vote => {
      // Handle timestamp conversion
      let voteDate;
      if (vote.timestamp?.toDate) {
        voteDate = vote.timestamp.toDate();
      } else if (vote.timestamp) {
        voteDate = new Date(vote.timestamp);
      } else {
        return false;
      }

      // Handle day filter if selected
      if (selectedDay) {
        const voteDay = getDayFromTimestamp(vote.timestamp);
        if (voteDay !== selectedDay) {
          return false;
        }
      }

      // Handle time range filter
      const matchesTime = timeRange === 'all' || voteDate >= startDate;
      
      // Handle vote type filter
      const matchesFilter = filterType === 'all' || 
                          (filterType === 'likes' && vote.voteType === 'like') || 
                          (filterType === 'dislikes' && vote.voteType === 'dislike');
      
      return matchesTime && matchesFilter;
    });
  };

  const getVoteCountsByItem = () => {
    const filteredData = getFilteredData();
    const counts = {};
    
    filteredData.forEach(vote => {
      if (!vote.item || typeof vote.item !== 'string' || vote.item.trim() === '') return;
      
      const itemName = vote.item.trim();
      if (!counts[itemName]) {
        counts[itemName] = { likes: 0, dislikes: 0, total: 0 };
      }
      
      if (vote.voteType === 'like') {
        counts[itemName].likes++;
        counts[itemName].total++;
      } else if (vote.voteType === 'dislike') {
        counts[itemName].dislikes++;
        counts[itemName].total++;
      }
    });

    return Object.entries(counts)
      .map(([item, data]) => ({
        item,
        likes: data.likes,
        dislikes: data.dislikes,
        total: data.total,
        ratio: data.total > 0 ? (data.likes / data.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  };

  const getMostLikedMeal = () => {
    const voteCounts = getVoteCountsByItem();
    return voteCounts.length > 0 
      ? voteCounts.reduce((max, current) => current.likes > max.likes ? current : max)
      : null;
  };

  const getDailyTrends = () => {
    const filteredData = getFilteredData();
    const dailyData = {};
    
    filteredData.forEach(vote => {
      let voteDate;
      if (vote.timestamp?.toDate) {
        voteDate = vote.timestamp.toDate();
      } else {
        voteDate = new Date(vote.timestamp);
      }
      
      const dateString = voteDate.toISOString().split('T')[0];
      
      if (!dailyData[dateString]) {
        dailyData[dateString] = { date: dateString, likes: 0, dislikes: 0 };
      }
      
      if (vote.voteType === 'like') {
        dailyData[dateString].likes++;
      } else if (vote.voteType === 'dislike') {
        dailyData[dateString].dislikes++;
      }
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Get available days that have votes
  const getAvailableDays = () => {
    const daysWithVotes = new Set();
    voteData.forEach(vote => {
      const day = getDayFromTimestamp(vote.timestamp);
      if (day) {
        daysWithVotes.add(day);
      }
    });
    
    // Return days in order, but only show days that have votes
    return DAYS_OF_WEEK.filter(day => daysWithVotes.has(day));
  };

  // Get menu items for selected day
  const getMenuForDay = (day) => {
    if (!day) return [];
    
    // Find the weekly menu document
    const weeklyMenu = menuData.find(menu => menu.id === 'weekly' || menu.weekly);
    
    if (weeklyMenu) {
      // Check for day-specific data in the weekly document
      const dayLower = day.toLowerCase();
      
      // Look for the day as a field in the weekly document
      if (weeklyMenu[dayLower]) {
        // If it's an object with breakfast/dinner, extract all items
        if (typeof weeklyMenu[dayLower] === 'object' && !Array.isArray(weeklyMenu[dayLower])) {
          let allItems = [];
          Object.keys(weeklyMenu[dayLower]).forEach(mealType => {
            const mealItems = weeklyMenu[dayLower][mealType];
            if (Array.isArray(mealItems)) {
              allItems = [...allItems, ...mealItems];
            }
          });
          return allItems.filter(item => item && item.trim() !== '');
        }
        // If it's already an array, return it directly
        else if (Array.isArray(weeklyMenu[dayLower])) {
          return weeklyMenu[dayLower].filter(item => item && item.trim() !== '');
        }
      }
      
      // Also check for capitalized day names
      if (weeklyMenu[day]) {
        if (typeof weeklyMenu[day] === 'object' && !Array.isArray(weeklyMenu[day])) {
          let allItems = [];
          Object.keys(weeklyMenu[day]).forEach(mealType => {
            const mealItems = weeklyMenu[day][mealType];
            if (Array.isArray(mealItems)) {
              allItems = [...allItems, ...mealItems];
            }
          });
          return allItems.filter(item => item && item.trim() !== '');
        }
        else if (Array.isArray(weeklyMenu[day])) {
          return weeklyMenu[day].filter(item => item && item.trim() !== '');
        }
      }
    }
    
    // Also check if there's a direct document for the day
    const dayLower = day.toLowerCase();
    const dayMenu = menuData.find(menu => 
      menu.id === dayLower || 
      (menu.day && menu.day.toLowerCase() === dayLower)
    );
    
    if (dayMenu && dayMenu.items) {
      return Array.isArray(dayMenu.items) ? 
        dayMenu.items.filter(item => item && item.trim() !== '') : [];
    }
    
    return [];
  };

  const voteCounts = getVoteCountsByItem();
  const mostLiked = getMostLikedMeal();
  const dailyTrends = getDailyTrends();
  const totalVotes = getFilteredData().length;
  const totalLikes = getFilteredData().filter(v => v.voteType === 'like').length;
  const totalDislikes = getFilteredData().filter(v => v.voteType === 'dislike').length;
  const availableDays = getAvailableDays();
  const menuItems = getMenuForDay(selectedDay);

  if (loading) {
    return (
      <div className="statsWrapper">
        <div className="analytics-container">
          <div className="loading-container">
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading Analytics Dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statsWrapper">
        <div className="analytics-container">
          <div className="loading-container">
            <div className="error-card">
              <div className="error-content">
                <div className="error-icon">⚠️</div>
                <div className="error-details">
                  <div className="error-title">Error Loading Data</div>
                  <div className="error-message">{error}</div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="error-refresh-btn"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="statsWrapper">
      <div className="analytics-container">
        <div className="analytics-content">
          <div className="analytics-header">
            <h1 className="analytics-title">📊 Vote Analytics Dashboard</h1>
            <p className="analytics-subtitle">Analyze voting patterns and meal preferences</p>
          </div>

          {/* Filter Controls */}
          <div className="filter-panel">
            <div className="filter-controls">
              <div className="filter-group">
                <Calendar className="filter-icon" size={20} />
                <select 
                  value={selectedDay} 
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select a day</option>
                  {availableDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <Filter className="filter-icon" size={20} />
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="filter-select"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="filter-group">
                <TrendingUp className="filter-icon" size={20} />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Votes</option>
                  <option value="likes">Likes Only</option>
                  <option value="dislikes">Dislikes Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-label">Total Votes</p>
                  <p className="stat-value">{totalVotes}</p>
                </div>
                <Users className="stat-icon" size={24} />
              </div>
            </div>

            <div className="stat-card likes-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-label">Total Likes</p>
                  <p className="stat-value likes-value">{totalLikes}</p>
                </div>
                <div className="stat-emoji">👍</div>
              </div>
            </div>

            <div className="stat-card dislikes-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-label">Total Dislikes</p>
                  <p className="stat-value dislikes-value">{totalDislikes}</p>
                </div>
                <div className="stat-emoji">👎</div>
              </div>
            </div>

            <div className="stat-card rate-card">
              <div className="stat-content">
                <div className="stat-info">
                  <p className="stat-label">Like Rate</p>
                  <p className="stat-value rate-value">
                    {totalVotes > 0 ? ((totalLikes / totalVotes) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <Award className="stat-icon" size={24} />
              </div>
            </div>
          </div>

          {/* Most Liked Item Card */}
          {mostLiked && (
            <div className="most-liked-card">
              <div className="most-liked-content">
                <div className="most-liked-info">
                  <p className="most-liked-label">Most Liked Item</p>
                  <p className="most-liked-name">{mostLiked.item}</p>
                  <p className="most-liked-stats">{mostLiked.likes} likes • {mostLiked.ratio.toFixed(1)}% positive</p>
                </div>
                <Award className="most-liked-icon" size={24} />
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Vote Counts by Item</h3>
              {voteCounts.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={voteCounts.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="item" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                        fill="#1a4d1a"
                      />
                      <YAxis fill="#555" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '2px solid #228b22',
                          borderRadius: '12px',
                          boxShadow: '0 8px 25px rgba(34, 139, 34, 0.15)'
                        }}
                      />
                      <Bar dataKey="likes" fill="#228B22" name="Likes" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dislikes" fill="#ef4444" name="Dislikes" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="no-data">
                  <p>No vote data available for the selected filters</p>
                </div>
              )}
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Most Popular Items</h3>
              {voteCounts.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={voteCounts.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        label={({ item, percent }) => `${item.length > 10 ? item.substring(0, 10) + '...' : item} ${(percent * 100).toFixed(0)}%`}
                      >
                        {voteCounts.slice(0, 6).map((entry, index) => (
                          <Cell key={entry.item} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.item]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '2px solid #228b22',
                          borderRadius: '12px',
                          boxShadow: '0 8px 25px rgba(34, 139, 34, 0.15)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="no-data">
                  <p>No vote data available for the selected filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Trends */}
          <div className="chart-card trends-card">
            <h3 className="chart-title">📈 Daily Vote Trends</h3>
            {dailyTrends.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      fill="#1a4d1a"
                    />
                    <YAxis fill="#555" />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #228b22',
                        borderRadius: '12px',
                        boxShadow: '0 8px 25px rgba(34, 139, 34, 0.15)'
                      }}
                    />
                    <Line type="monotone" dataKey="likes" stroke="#22c55e" strokeWidth={3} name="Likes" dot={{ fill: '#22c55e', strokeWidth: 2, r: 6 }} />
                    <Line type="monotone" dataKey="dislikes" stroke="#ef4444" strokeWidth={3} name="Dislikes" dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="no-data">
                <p>No trend data available for the selected filters</p>
              </div>
            )}
          </div>

          {/* Menu Section */}
          <div className="menu-section">
            <h3 className="menu-title">
              🍽️ Menu for {selectedDay || 'No day selected'}
            </h3>
            <div className="menu-grid ">
              {selectedDay && menuItems.length > 0 ? (
                menuItems
                  .filter(item => item && item.trim() !== '')
                  .map((item, index) => {
                    const itemVotes = voteCounts.find(v => v.item.toLowerCase() === item.toLowerCase());
                    return (
                      <div
                        key={`${selectedDay}-${item}-${index}`}
                        className="menu-item-card"
                      >
                        <h4 className="menu-item-name">{item}</h4>
                        {itemVotes ? (
                          <div className="menu-item-votes">
                            <span className="vote-like">👍 {itemVotes.likes}</span>
                            <span className="vote-dislike">👎 {itemVotes.dislikes}</span>
                            <span className="vote-percentage">
                              {itemVotes.ratio.toFixed(1)}% positive
                            </span>
                          </div>
                        ) : (
                          <div className="no-votes">No votes yet</div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="no-menu-data">
                  {!selectedDay 
                    ? "Please select a day to view the menu" 
                    : menuData.length === 0 
                      ? "Loading menu data..." 
                      : "No menu items available for this day"
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteAnalytics;