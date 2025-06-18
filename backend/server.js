const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache"); // npm install node-cache
const { admin, db } = require("./firebaseAdmin");
const cafeRoutes = require("./backedroutes");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize caches
const menuCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
const votesCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache for votes
const userVotesCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache for user votes
const leaderboardCache = new NodeCache({ stdTTL: 900 }); // 15 minutes cache for leaderboard

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

const heavyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: "Rate limit exceeded for this endpoint."
});

app.use(limiter);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Use Aunty's Café routes
app.use("/auntys-cafe", cafeRoutes);

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weekly Mess Menu (keep as static data)
let messMenu = {
  Monday: {
    breakfast: ["Aloo Paratha", "Butter", "Onion Flakes", "Chana Sprouts"],
    lunch: ["Aloo Cabbage", "Rajma", "Rice", "Dal Fry", "Butter Milk"],
    snacks: ["Chowmein", "Samosa", "Tea", "Coffee"],
    dinner: ["Palak Corn", "Roti", "Rice", "Motichoor Laddu", "Boondi"]
  },
  Tuesday: {
    breakfast: ["Moong Chilla", "Chutney", "Daliya", "Moong Sprouts", "Guava", "Banana"],
    lunch: ["Aloo Matar", "Gravy Chana Masala", "Jeera Rice", "Achar", "Salad"],
    snacks: ["Vada Pav", "Pickle", "Chilli + Red & Green Chutney", "Tea", "Coffee"],
    dinner: ["Chhola", "Puri", "Aloo Beans", "Rice", "Roti", "Lung Laddu"]
  },
  Wednesday: {
    breakfast: ["Mix Paratha", "Butter", "Chutney", "Corn Flakes", "Moong Sprouts"],
    lunch: ["Lauki Aloo", "Dry Soya Chunks", "Panchratan Dal", "Boondi Raita", "Chips"],
    snacks: ["Pasta", "Tea", "Coffee"],
    dinner: ["Veg Paneer Kali Mirch Matar", "Jeera Rice", "Roti", "Arhar Dal", "Achar"]
  },
  Thursday: {
    breakfast: ["Uttapam", "Idli", "Sambhar", "Coconut Chutney", "Banana", "Chana Salted"],
    lunch: ["Kathol", "Methi Phulki", "Tomato Salad", "Rice", "Papad", "Dal Makhani", "Paratha"],
    snacks: ["Aloo Corn Sandwich", "Tea", "Coffee"],
    dinner: ["Veg Kofta", "Paneer Bhurji", "Rice", "Roti", "Gulab Jamun"]
  },
  Friday: {
    breakfast: ["Paneer Paratha", "Butter", "Corn Flakes", "Chana"],
    lunch: ["Matar Mushroom Dry", "Kadi Pakoda", "Masoor Dal Fry", "Papad"],
    snacks: ["Poha", "Tea", "Coffee"],
    dinner: ["Veg Kadai Paneer", "Dal Fry", "Roti", "Rice", "Pickle"]
  },
  Saturday: {
    breakfast: ["Methi Puri", "Bhaji", "Aloo", "Namkeen", "Banana", "Chana Sprouts"],
    lunch: ["Aloo Ko Chokha Seasonal Veg", "Papad", "Kadhi", "Curd", "Rice", "French Fries"],
    snacks: ["Pav Bhaji", "Tea", "Coffee"],
    dinner: ["Matar Paneer", "Roti", "Rice", "Boondi Raita", "Moong Dal"]
  },
  Sunday: {
    breakfast: ["Masala Dosa", "Chutney", "Sambhar", "Cornflakes", "Sprouts", "Bread", "Butter", "Jam"],
    lunch: ["Chole Bhature", "Jeera Aloo", "Dal", "Papad", "Dahi", "Achar"],
    snacks: ["Aloo Tikki", "Sauce", "Tea", "Coffee"],
    dinner: ["Paneer Masala", "Dal Fry", "Rice", "Roti", "Lemon", "Onion", "Tomato"]
  }
};

const quotes = [
  "Let food be thy medicine and medicine be thy food.",
  "You don't need a silver fork to eat good food.",
  "Food is symbolic of love when words are inadequate.",
  "One cannot think well, love well, sleep well, if one has not dined well.",
  "Good food equals good mood!"
];

// Daily quote cache (only changes once per day)
let dailyQuoteCache = {
  quote: null,
  date: null
};

// Initialize menu in Firestore (only run once)
async function initializeMenu() {
  try {
    const cacheKey = 'menu_initialized';
    if (menuCache.get(cacheKey)) {
      console.log('✅ Menu initialization skipped (cached)');
      return;
    }

    const menuRef = db.collection('menu').doc('weekly');
    const doc = await menuRef.get();
    if (!doc.exists) {
      await menuRef.set(messMenu);
      console.log('✅ Menu initialized in Firestore');
    } else {
      console.log('✅ Menu already exists in Firestore, skipping initialization');
    }
    
    // Cache the initialization status for 24 hours
    menuCache.set(cacheKey, true, 86400);
  } catch (error) {
    console.error('❌ Error initializing menu:', error);
  }
}

// Initialize dish votes in Firestore (only run once)
async function initializeDishVotes() {
  try {
    const cacheKey = 'votes_initialized';
    if (menuCache.get(cacheKey)) {
      console.log('✅ Dish votes initialization skipped (cached)');
      return;
    }

    const allDishes = new Set();
    for (let dayMeals of Object.values(messMenu)) {
      for (let items of Object.values(dayMeals)) {
        for (let dish of items) {
          allDishes.add(dish);
        }
      }
    }

    const batch = db.batch();
    let batchCount = 0;

    for (let dish of allDishes) {
      const safeDishId = dish.replace(/\//g, "_");
      const dishRef = db.collection("dishVotes").doc(safeDishId);
      
      // Check if document exists (single read per dish)
      const doc = await dishRef.get();
      if (!doc.exists) {
        batch.set(dishRef, {
          item: dish,
          like: 0,
          dislike: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batchCount++;
        
        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // Cache the initialization status for 24 hours
    menuCache.set(cacheKey, true, 86400);
    console.log("✅ Dish votes initialized in Firestore");
  } catch (error) {
    console.error("❌ Error initializing dish votes:", error);
  }
}

// Middleware to verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Cache decoded tokens for 10 minutes to reduce verification calls
    const tokenCacheKey = `token_${token.substring(0, 20)}`;
    let decodedToken = userVotesCache.get(tokenCacheKey);
    
    if (!decodedToken) {
      decodedToken = await admin.auth().verifyIdToken(token);
      userVotesCache.set(tokenCacheKey, decodedToken, 600);
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Store/Update user profile in Firestore with caching
async function saveUserProfile(userInfo) {
  try {
    const cacheKey = `user_save_${userInfo.uid}`;
    const recentlySaved = userVotesCache.get(cacheKey);
    
    // Prevent duplicate saves within 5 minutes
    if (recentlySaved) {
      return { cached: true };
    }

    const userRef = db.collection('users').doc(userInfo.uid);
    await userRef.set({
      uid: userInfo.uid,
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      photoURL: userInfo.picture || null,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Cache to prevent duplicate saves
    userVotesCache.set(cacheKey, true, 300);
    return { saved: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

// API to save user profile (with heavy rate limiting)
app.post("/save-user", heavyLimiter, verifyToken, async (req, res) => {
  try {
    const result = await saveUserProfile(req.user);
    res.json({ 
      success: true, 
      message: result.cached ? "User profile recently saved" : "User profile saved" 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save user profile" });
  }
});

// API to get today's menu with cached vote counts
app.get("/menu", heavyLimiter, async (req, res) => {
  try {
    const todayIndex = new Date().getDay();
    const today = days[todayIndex];
    const cacheKey = `menu_${today}`;
    
    // Check cache first
    const cachedData = menuCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Use static menu data instead of reading from Firestore every time
    const todayMenu = messMenu[today] || {};

    // Get current day's vote counts (cached)
    const votesCacheKey = `votes_${today}`;
    let votesMap = votesCache.get(votesCacheKey);
    
    if (!votesMap) {
      const votesSnapshot = await db.collection('dishVotes').get();
      votesMap = {};
      votesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only include votes for items in today's menu
        const allTodayItems = Object.values(todayMenu).flat();
        if (allTodayItems.includes(data.item)) {
          votesMap[data.item] = { like: data.like, dislike: data.dislike };
        }
      });
      
      // Cache votes for 5 minutes
      votesCache.set(votesCacheKey, votesMap);
    }

    const responseData = { menu: todayMenu, votes: votesMap, day: today };
    
    // Cache menu response for 1 hour
    menuCache.set(cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// Vote API with optimized caching
app.post("/vote", verifyToken, async (req, res) => {
  const { item, type, day, timestamp } = req.body;
  const userId = req.user.uid;

  if (!["like", "dislike", "neutral"].includes(type)) {
    return res.status(400).json({ error: "Invalid vote type" });
  }

  const todayIndex = new Date().getDay();
  const today = days[todayIndex];
  if (day !== today) {
    return res.status(400).json({ error: "Vote submitted for incorrect day" });
  }

  try {
    const safeDishId = item.replace(/\//g, "_");
    const userVoteRef = db.collection('userVotes').doc(`${userId}_${safeDishId}_${day}`);
    const dishVoteRef = db.collection('dishVotes').doc(safeDishId);

    const result = await db.runTransaction(async (transaction) => {
      const [userVoteDoc, dishVoteDoc] = await Promise.all([
        transaction.get(userVoteRef),
        transaction.get(dishVoteRef)
      ]);

      if (!dishVoteDoc.exists) {
        throw new Error("Item not found");
      }

      const currentVote = userVoteDoc.exists ? userVoteDoc.data().voteType : null;
      let newVoteType = type;
      const dishVoteData = dishVoteDoc.data();
      const updates = {};

      // Toggle off if clicking same vote type
      if (currentVote === type && type !== "neutral") {
        transaction.delete(userVoteRef);
        updates[type] = admin.firestore.FieldValue.increment(-1);
        newVoteType = null;
      }
      // Change vote or new vote
      else if (currentVote && type !== "neutral") {
        transaction.set(userVoteRef, {
          userId,
          item,
          voteType: type,
          day,
          timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        updates[currentVote] = admin.firestore.FieldValue.increment(-1);
        updates[type] = admin.firestore.FieldValue.increment(1);
      }
      else if (type !== "neutral") {
        transaction.set(userVoteRef, {
          userId,
          item,
          voteType: type,
          day,
          timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp()
        });
        updates[type] = admin.firestore.FieldValue.increment(1);
      }

      if (Object.keys(updates).length > 0) {
        transaction.update(dishVoteRef, updates);
      }

      return { newVoteType, dishVoteData: { ...dishVoteData, ...updates } };
    });

    // Clear relevant caches after vote
    votesCache.del(`votes_${today}`);
    menuCache.del(`menu_${today}`);
    userVotesCache.del(`user_votes_${userId}_${today}`);
    leaderboardCache.del('leaderboard');

    // Fetch updated data (single read)
    const updatedDishDoc = await dishVoteRef.get();
    
    // Get user votes from cache or fetch
    const userVotesCacheKey = `user_votes_${userId}_${today}`;
    let userVotesMap = userVotesCache.get(userVotesCacheKey);
    
    if (!userVotesMap) {
      const updatedUserVotes = await db.collection('userVotes')
        .where('userId', '==', userId)
        .where('day', '==', today)
        .get();
      userVotesMap = {};
      updatedUserVotes.forEach(doc => {
        const data = doc.data();
        userVotesMap[data.item] = data.voteType;
      });
      userVotesCache.set(userVotesCacheKey, userVotesMap);
    }

    res.json({
      success: true,
      votes: {
        like: updatedDishDoc.data().like,
        dislike: updatedDishDoc.data().dislike
      },
      userVotes: userVotesMap
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, error: "Failed to record vote" });
  }
});

// Get user's votes for current day (heavily cached)
app.get("/user-votes", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const todayIndex = new Date().getDay();
    const today = days[todayIndex];
    const cacheKey = `user_votes_${userId}_${today}`;

    // Check cache first
    let userVotes = userVotesCache.get(cacheKey);
    
    if (!userVotes) {
      const userVotesSnapshot = await db.collection('userVotes')
        .where('userId', '==', userId)
        .where('day', '==', today)
        .get();

      userVotes = {};
      userVotesSnapshot.forEach(doc => {
        const data = doc.data();
        userVotes[data.item] = data.voteType;
      });
      
      // Cache for 10 minutes
      userVotesCache.set(cacheKey, userVotes);
    }

    res.json(userVotes);
  } catch (error) {
    console.error("Error fetching user votes:", error);
    res.status(500).json({ error: "Failed to fetch user votes" });
  }
});

// Quote of the day (cached daily)
app.get("/daily-quote", (req, res) => {
  const today = new Date().toDateString();
  
  // Check if we have today's quote cached
  if (dailyQuoteCache.quote && dailyQuoteCache.date === today) {
    return res.json({ quote: dailyQuoteCache.quote });
  }
  
  // Generate new quote and cache it
  const index = new Date().getDate() % quotes.length;
  const quote = quotes[index];
  
  dailyQuoteCache = { quote, date: today };
  res.json({ quote });
});

// Top 5 liked dishes leaderboard (cached)
app.get("/leaderboard", async (req, res) => {
  try {
    const cacheKey = 'leaderboard';
    let leaderboard = leaderboardCache.get(cacheKey);
    
    if (!leaderboard) {
      const votesSnapshot = await db.collection('dishVotes')
        .orderBy('like', 'desc')
        .limit(5)
        .get();

      leaderboard = [];
      votesSnapshot.forEach(doc => {
        const data = doc.data();
        leaderboard.push({ _id: data.item, count: data.like });
      });
      
      // Cache for 15 minutes
      leaderboardCache.set(cacheKey, leaderboard);
    }

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Get user profile (cached)
app.get("/user-profile", verifyToken, async (req, res) => {
  try {
    const cacheKey = `profile_${req.user.uid}`;
    let userProfile = userVotesCache.get(cacheKey);
    
    if (!userProfile) {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
        userVotesCache.set(cacheKey, userProfile);
        res.json(userProfile);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } else {
      res.json(userProfile);
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Admin endpoint to initialize data (rate limited)
app.get("/admin/init-data", heavyLimiter, async (req, res) => {
  try {
    await initializeMenu();
    await initializeDishVotes();
    res.status(200).send("✅ Menu and votes initialized");
  } catch (error) {
    console.error("❌ Init error:", error);
    res.status(500).send("Initialization failed");
  }
});

// Initialize data on server start (only once)
let initialized = false;
if (!initialized) {
  initializeMenu();
  initializeDishVotes();
  initialized = true;
}

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});