import React, { useState, useEffect } from 'react';
import { User, Trophy, Heart, Coffee, Utensils, Star, Award, TrendingUp, Loader2 } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, onSnapshot, orderBy, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState({
    totalMessVotes: 0,
    totalCafeVotes: 0,
    messLikes: 0,
    messNeutral: 0,
    messDislikes: 0,
    cafeLikes: 0,
    cafeNeutral: 0,
    cafeDislikes: 0,
    topMessDishes: [],
    topCafeDishes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  // Firebase authentication listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Update user document with login timestamp
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          }).catch(async (error) => {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
              await setDoc(userDocRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              });
            }
          });
        } catch (error) {
          console.error('Error updating user document:', error);
        }
      } else {
        setLoading(false);
        setUserData(null);
        setUserStats({
          totalMessVotes: 0,
          totalCafeVotes: 0,
          messLikes: 0,
          messNeutral: 0,
          messDislikes: 0,
          cafeLikes: 0,
          cafeNeutral: 0,
          cafeDislikes: 0,
          topMessDishes: [],
          topCafeDishes: []
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to user data and votes changes
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeUser = null;
    let unsubscribeMessVotes = null;
    let unsubscribeCafeVotes = null;

    try {
      // Listen to user document changes
      const userDocRef = doc(db, 'users', currentUser.uid);
      unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserData({
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate() || new Date()
          });
        } else {
          setError('User profile not found');
        }
      }, (error) => {
        console.error('Error listening to user data:', error);
        setError('Failed to load user data: ' + error.message);
      });

      // Listen to mess votes
      const messVotesQuery = query(
        collection(db, 'userVotes'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      unsubscribeMessVotes = onSnapshot(messVotesQuery, (snapshot) => {
        const messVotes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        updateMessStats(messVotes);
      }, (error) => {
        console.error('Error listening to mess votes:', error);
        // Don't set error state for votes as it's not critical
      });

      // Listen to cafe votes
      const cafeVotesQuery = query(
        collection(db, 'cafeUserVotes'),
        where('userName', '==', currentUser.displayName),
        orderBy('timestamp', 'desc')
      );

      unsubscribeCafeVotes = onSnapshot(cafeVotesQuery, (snapshot) => {
        const cafeVotes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        updateCafeStats(cafeVotes);
        setLoading(false);
      }, (error) => {
        console.error('Error listening to cafe votes:', error);
        setLoading(false);
        // Don't set error state for votes as it's not critical
      });

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setError('Failed to connect to database: ' + error.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeMessVotes) unsubscribeMessVotes();
      if (unsubscribeCafeVotes) unsubscribeCafeVotes();
    };
  }, [currentUser]);

  const updateMessStats = (messVotes) => {
    const messLikes = messVotes.filter(vote => vote.voteType === 'like').length;
    const messNeutral = messVotes.filter(vote => vote.voteType === 'neutral').length;
    const messDislikes = messVotes.filter(vote => vote.voteType === 'dislike').length;

    // Calculate top dishes
    const dishLikeCounts = {};
    messVotes.forEach(vote => {
      if (vote.voteType === 'like' && vote.item) {
        dishLikeCounts[vote.item] = (dishLikeCounts[vote.item] || 0) + 1;
      }
    });

    const topMessDishes = Object.entries(dishLikeCounts)
      .map(([dish, likes]) => ({ name: dish, likes, type: 'like' }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    setUserStats(prev => ({
      ...prev,
      totalMessVotes: messVotes.length,
      messLikes,
      messNeutral,
      messDislikes,
      topMessDishes
    }));
  };

  const updateCafeStats = (cafeVotes) => {
    const cafeLikes = cafeVotes.filter(vote => vote.type === 'like').length;
    const cafeNeutral = cafeVotes.filter(vote => vote.type === 'neutral').length;
    const cafeDislikes = cafeVotes.filter(vote => vote.type === 'dislike').length;

    // Calculate top cafe items - using 'itemName' field instead of 'userName'
    const cafeLikeCounts = {};
    cafeVotes.forEach(vote => {
      if (vote.type === 'like' && vote.itemName) {
        cafeLikeCounts[vote.itemName] = (cafeLikeCounts[vote.itemName] || 0) + 1;
      }
    });

    const topCafeDishes = Object.entries(cafeLikeCounts)
      .map(([item, likes]) => ({ name: item, likes, type: 'like' }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    setUserStats(prev => ({
      ...prev,
      totalCafeVotes: cafeVotes.length,
      cafeLikes,
      cafeNeutral,
      cafeDislikes,
      topCafeDishes
    }));
  };

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in: ' + error.message);
    } finally {
      setSigningIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out: ' + error.message);
    }
  };

  // Calculate user titles
  const getUserTitle = () => {
    const totalVotes = userStats.totalMessVotes + userStats.totalCafeVotes;
    const totalLikes = userStats.messLikes + userStats.cafeLikes;
    const positivityRate = totalVotes > 0 ? totalLikes / totalVotes : 0;
    
    if (userStats.totalMessVotes > userStats.totalCafeVotes) {
      if (positivityRate > 0.8) return { title: "Mess Enthusiast", icon: "🍽️", color: "bg-green-500" };
      if (positivityRate > 0.6) return { title: "Mess Lover", icon: "❤️", color: "bg-blue-500" };
      return { title: "Mess Regular", icon: "🍛", color: "bg-yellow-500" };
    } else if (userStats.totalCafeVotes > userStats.totalMessVotes) {
      if (positivityRate > 0.8) return { title: "Cafe Connoisseur", icon: "☕", color: "bg-amber-600" };
      if (positivityRate > 0.6) return { title: "Cafe Lover", icon: "💕", color: "bg-pink-500" };
      return { title: "Cafe Regular", icon: "🥪", color: "bg-orange-500" };
    } else {
      return { title: "Food Explorer", icon: "🌟", color: "bg-purple-500" };
    }
  };

  const userTitle = getUserTitle();

  const StatCard = ({ icon: Icon, title, value, color = "bg-blue-500" }) => (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 transform hover:scale-105 transition-transform duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 text-blue-600`} />
        </div>
      </div>
    </div>
  );

  const DishCard = ({ dishes, title, icon: Icon, bgColor }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-lg ${bgColor} bg-opacity-10 mr-3`}>
          <Icon className={`h-5 w-5 text-orange-600`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {dishes.length > 0 ? (
          dishes.map((dish, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">#{index + 1}</span>
                <span className="text-gray-900 font-medium">{dish.name}</span>
              </div>
              <div className="flex items-center">
                <Heart className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm font-medium text-gray-600">{dish.likes}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No votes yet! Start voting to see your favorites.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your profile...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Campus GrubHub</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your food voting profile</p>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          <button 
            onClick={handleSignIn}
            disabled={signingIn}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In with Google'
            )}
          </button>
        </div>
      </div>
    );
  }

  const totalVotes = userStats.totalMessVotes + userStats.totalCafeVotes;
  const totalLikes = userStats.messLikes + userStats.cafeLikes;
  const positivityRate = totalVotes > 0 ? Math.round((totalLikes / totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Sign Out */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Updates
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-800 bg-white px-3 py-1 rounded-full border hover:bg-gray-50 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="relative">
                <img
                  src={userData?.photoURL || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=3b82f6&color=fff`}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=3b82f6&color=fff`;
                  }}
                />
                <div className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white ${userTitle.color} flex items-center`}>
                  <span className="mr-1">{userTitle.icon}</span>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {userData?.displayName || currentUser?.displayName || 'Anonymous User'}
                </h1>
                <p className="text-gray-600 mb-3">{userData?.email || currentUser?.email}</p>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white ${userTitle.color} shadow-md`}>
                  <Award className="h-4 w-4 mr-2" />
                  {userTitle.title}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Member since</p>
              <p className="text-sm font-medium text-gray-900 mb-2">
                {userData?.createdAt ? userData.createdAt.toLocaleDateString() : 'Today'}
              </p>
              <p className="text-sm text-gray-500">Last active</p>
              <p className="text-sm font-medium text-gray-900">
                {userData?.lastLogin ? userData.lastLogin.toLocaleDateString() : 'Today'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={Utensils}
            title="Total Mess Votes"
            value={userStats.totalMessVotes}
            color="bg-green-500"
          />
          <StatCard
            icon={Coffee}
            title="Total Cafe Votes"
            value={userStats.totalCafeVotes}
            color="bg-amber-500"
          />
          <StatCard
            icon={Heart}
            title="Total Likes"
            value={totalLikes}
            color="bg-red-500"
          />
          <StatCard
            icon={TrendingUp}
            title="Positivity Rate"
            value={`${positivityRate}%`}
            color="bg-purple-500"
          />
        </div>

        {/* Voting Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Utensils className="h-5 w-5 mr-2 text-green-600" />
              Mess Voting Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700 font-medium">👍 Likes</span>
                <span className="font-bold text-green-600 text-lg">{userStats.messLikes}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-gray-700 font-medium">😐 Neutral</span>
                <span className="font-bold text-yellow-600 text-lg">{userStats.messNeutral}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-gray-700 font-medium">👎 Dislikes</span>
                <span className="font-bold text-red-600 text-lg">{userStats.messDislikes}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Coffee className="h-5 w-5 mr-2 text-amber-600" />
              Cafe Voting Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700 font-medium">👍 Likes</span>
                <span className="font-bold text-green-600 text-lg">{userStats.cafeLikes}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-gray-700 font-medium">😐 Neutral</span>
                <span className="font-bold text-yellow-600 text-lg">{userStats.cafeNeutral}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-gray-700 font-medium">👎 Dislikes</span>
                <span className="font-bold text-red-600 text-lg">{userStats.cafeDislikes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Dishes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DishCard
            dishes={userStats.topMessDishes}
            title="Top 5 Mess Favorites"
            icon={Utensils}
            bgColor="bg-green-500"
          />
          <DishCard
            dishes={userStats.topCafeDishes}
            title="Top 5 Cafe Favorites"
            icon={Coffee}
            bgColor="bg-amber-500"
          />
        </div>

        {/* Achievement Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Your Food Journey
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl border border-yellow-200">
              <Star className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
              <p className="font-bold text-gray-900 text-lg mb-1">Food Critic</p>
              <p className="text-sm text-gray-600">Voted on {totalVotes} items</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
              <Heart className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <p className="font-bold text-gray-900 text-lg mb-1">Positive Vibes</p>
              <p className="text-sm text-gray-600">{totalLikes} likes given</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-green-200">
              <User className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <p className="font-bold text-gray-900 text-lg mb-1">Active Member</p>
              <p className="text-sm text-gray-600">
                Since {userData?.createdAt ? userData.createdAt.toLocaleDateString() : 'Today'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;