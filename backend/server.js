const express = require("express");
const cors = require("cors");
const { admin, db } = require("./firebaseAdmin");
const cafeRoutes = require("./backedroutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Use Aunty's Café routes
app.use("/auntys-cafe", cafeRoutes);

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weekly Mess Menu
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

// Initialize menu in Firestore
async function initializeMenu() {
  try {
    const menuRef = db.collection('menu').doc('weekly');
    const doc = await menuRef.get();
    if (!doc.exists) {
      await menuRef.set(messMenu);
      console.log('✅ Menu initialized in Firestore');
    } else {
      console.log('✅ Menu already exists in Firestore, skipping initialization');
    }
  } catch (error) {
    console.error('❌ Error initializing menu:', error);
  }
}

// Initialize dish votes in Firestore
async function initializeDishVotes() {
  try {
    const allDishes = new Set();
    for (let dayMeals of Object.values(messMenu)) {
      for (let items of Object.values(dayMeals)) {
        for (let dish of items) {
          allDishes.add(dish);
        }
      }
    }

    for (let dish of allDishes) {
      const safeDishId = dish.replace(/\//g, "_");
      const dishRef = db.collection("dishVotes").doc(safeDishId);
      const doc = await dishRef.get();

      if (!doc.exists) {
        await dishRef.set({
          item: dish,
          like: 0,
          dislike: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

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
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Store/Update user profile in Firestore
async function saveUserProfile(userInfo) {
  try {
    const userRef = db.collection('users').doc(userInfo.uid);
    await userRef.set({
      uid: userInfo.uid,
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      photoURL: userInfo.picture || null,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

// API to save user profile
app.post("/save-user", verifyToken, async (req, res) => {
  try {
    await saveUserProfile(req.user);
    res.json({ success: true, message: "User profile saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save user profile" });
  }
});

// API to get today's menu with live vote counts
app.get("/menu", async (req, res) => {
  try {
    const todayIndex = new Date().getDay();
    const today = days[todayIndex];

    // Get menu from Firestore
    const menuDoc = await db.collection('menu').doc('weekly').get();
    if (!menuDoc.exists) {
      return res.status(404).json({ error: "Menu not found" });
    }
    const fullMenu = menuDoc.data();
    const todayMenu = fullMenu[today] || {};

    // Get current day's vote counts
    const votesSnapshot = await db.collection('dishVotes').get();
    const votesMap = {};
    votesSnapshot.forEach(doc => {
      const data = doc.data();
      // Only include votes for items in today's menu
      const allTodayItems = Object.values(todayMenu).flat();
      if (allTodayItems.includes(data.item)) {
        votesMap[data.item] = { like: data.like, dislike: data.dislike };
      }
    });

    res.json({ menu: todayMenu, votes: votesMap, day: today });
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// Vote API — like/dislike any item (requires authentication)
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

    await db.runTransaction(async (transaction) => {
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

    // Fetch updated data
    const updatedDishDoc = await dishVoteRef.get();
    const updatedUserVotes = await db.collection('userVotes')
      .where('userId', '==', userId)
      .where('day', '==', today)
      .get();
    const userVotesMap = {};
    updatedUserVotes.forEach(doc => {
      const data = doc.data();
      userVotesMap[data.item] = data.voteType;
    });

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

// Get user's votes for current day
app.get("/user-votes", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const todayIndex = new Date().getDay();
    const today = days[todayIndex];

    const userVotesSnapshot = await db.collection('userVotes')
      .where('userId', '==', userId)
      .where('day', '==', today)
      .get();

    const userVotes = {};
    userVotesSnapshot.forEach(doc => {
      const data = doc.data();
      userVotes[data.item] = data.voteType;
    });

    res.json(userVotes);
  } catch (error) {
    console.error("Error fetching user votes:", error);
    res.status(500).json({ error: "Failed to fetch user votes" });
  }
});

// Quote of the day
app.get("/daily-quote", (req, res) => {
  const index = new Date().getDate() % quotes.length;
  res.json({ quote: quotes[index] });
});

// Top 5 liked dishes leaderboard
app.get("/leaderboard", async (req, res) => {
  try {
    const votesSnapshot = await db.collection('dishVotes')
      .orderBy('like', 'desc')
      .limit(5)
      .get();

    const leaderboard = [];
    votesSnapshot.forEach(doc => {
      const data = doc.data();
      leaderboard.push({ _id: data.item, count: data.like });
    });

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Get user profile
app.get("/user-profile", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.exists) {
      res.json(userDoc.data());
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Admin endpoint to initialize data
app.get("/admin/init-data", async (req, res) => {
  try {
    await initializeMenu();
    await initializeDishVotes();
    res.status(200).send("✅ Menu and votes initialized");
  } catch (error) {
    console.error("❌ Init error:", error);
    res.status(500).send("Initialization failed");
  }
});

// Remove duplicate /init-menu endpoint
// app.get("/init-menu", ...) // Removed as it's redundant with /admin/init-data

// Initialize data on server start
initializeMenu();
initializeDishVotes();

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});