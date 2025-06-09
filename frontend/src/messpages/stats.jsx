import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Users, Award, Filter } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const VoteAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState('');
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
        
        // Set default selected date to the most recent menu date
        if (menu.length > 0) {
          const sortedMenu = menu
  .filter(m => m.date && !isNaN(new Date(m.date)))
  .sort((a, b) => new Date(b.date) - new Date(a.date));
if (sortedMenu.length > 0) {
  setSelectedDate(sortedMenu[0].date);
}

        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please check your Firebase configuration.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    // For 'all', we don't filter by time

    return voteData.filter(vote => {
      // Handle timestamp conversion
      let voteDate;
      if (vote.timestamp?.toDate) {
        // Firebase Timestamp
        voteDate = vote.timestamp.toDate();
      } else if (vote.timestamp) {
        // Regular date string or Date object
        voteDate = new Date(vote.timestamp);
      } else {
        // Skip votes without timestamp
        return false;
      }

      const matchesTime = timeRange === 'all' || voteDate >= startDate;
      const matchesFilter = filterType === 'all' || vote.voteType === filterType.replace('s', ''); // 'likes' -> 'like'
      
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
      } else if (vote.voteType === 'dislike') {
        counts[itemName].dislikes++;
      }
      counts[itemName].total++;
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

 const formatDate = (dateValue) => {
  try {
    if (!dateValue) return 'Invalid Date';

    let date;

    // Firestore Timestamp
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      console.warn('Invalid date input:', dateValue);
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateValue);
    return 'Invalid Date';
  }
};



  const voteCounts = getVoteCountsByItem();
  const mostLiked = getMostLikedMeal();
  const dailyTrends = getDailyTrends();
  const totalVotes = getFilteredData().length;
  const totalLikes = getFilteredData().filter(v => v.voteType === 'like').length;
  const totalDislikes = getFilteredData().filter(v => v.voteType === 'dislike').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Data</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vote Analytics Dashboard</h1>
          <p className="text-gray-600">Analyze voting patterns and meal preferences</p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              <select 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
              >
                <option value="">Select a date</option>
                {menuData
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((menu) => (
                    <option key={menu.id || menu.date} value={menu.date}>
                      {formatDate(menu.date)}
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-green-600" size={20} />
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={20} />
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Votes</p>
                <p className="text-2xl font-bold text-gray-800">{totalVotes}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Likes</p>
                <p className="text-2xl font-bold text-green-600">{totalLikes}</p>
              </div>
              <div className="text-green-600 text-2xl">👍</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Dislikes</p>
                <p className="text-2xl font-bold text-red-600">{totalDislikes}</p>
              </div>
              <div className="text-red-600 text-2xl">👎</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Like Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalVotes > 0 ? ((totalLikes / totalVotes) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Award className="text-purple-600" size={32} />
            </div>
          </div>
        </div>

        {/* Most Liked Item Card */}
        {mostLiked && (
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 mb-1">🏆 Most Liked Item</p>
                <p className="text-2xl font-bold">{mostLiked.item}</p>
                <p className="text-orange-100">{mostLiked.likes} likes • {mostLiked.ratio.toFixed(1)}% positive</p>
              </div>
              <Award className="text-orange-200" size={48} />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Vote Counts by Item</h3>
            {voteCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={voteCounts.slice(0, 10)}>
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
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No vote data available for the selected filters
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Most Popular Items</h3>
            {voteCounts.length > 0 ? (
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
                  <Tooltip formatter={(value, name, props) => [value, props.payload.item]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No vote data available for the selected filters
              </div>
            )}
          </div>
        </div>

        {/* Daily Trends */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Vote Trends</h3>
          {dailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                />
                <Line type="monotone" dataKey="likes" stroke="#22c55e" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="dislikes" stroke="#ef4444" strokeWidth={2} name="Dislikes" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No trend data available for the selected filters
            </div>
          )}
        </div>

        {/* Menu Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Menu for {selectedDate ? formatDate(selectedDate) : 'No date selected'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedDate && menuData.find(menu => menu.date === selectedDate)?.items ? (
              menuData.find(menu => menu.date === selectedDate).items
                .filter(item => item && item.trim() !== '')
                .map((item, index) => {
                  const itemVotes = voteCounts.find(v => v.item.toLowerCase() === item.toLowerCase());
                  return (
                    <div
                      key={`${selectedDate}-${item}-${index}`}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">{item}</h4>
                      {itemVotes ? (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600">👍 {itemVotes.likes}</span>
                          <span className="text-red-600">👎 {itemVotes.dislikes}</span>
                          <span className="text-gray-500">
                            {itemVotes.ratio.toFixed(1)}% positive
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">No votes yet</div>
                      )}
                    </div>
                  );
                })
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                {!selectedDate 
                  ? "Please select a date to view the menu" 
                  : menuData.length === 0 
                    ? "Loading menu data..." 
                    : "No menu items available for this date"
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteAnalytics;