const express = require("express");
const cors = require("cors");
const { admin, db } = require("./firebaseAdmin");
const cafeRoutes = require("./backedroutes");

const app = express();
app.use(cors());
app.use(express.json());




// Use Aunty's Café routes
app.use("/", cafeRoutes); // or "/api" if you prefer routes like /api/menu



const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weekly Mess Menu
let messMenu = {
  Monday: {
    breakfast: ["Aloo Paratha", "Butter", "Onion Flakes", "Chana Sprouts"],
    lunch: ["Aloo Cabbage", "Rajma", "Rice", "Dal Fry", "Butter Milk"],
    snacks: ["Chowmein Samosa", "Tea/Coffee"],
    dinner: ["Palak Corn", "Roti", "Rice", "Motichoor Laddu/Boondi"]
  },
  Tuesday: {
    breakfast: ["Moong Chilla", "Chutney", "Daliya", "Moong Sprouts", "Guava/Banana"],
    lunch: ["Aloo Matar", "Gravy Chana Masala", "Jeera Rice", "Achar", "Salad"],
    snacks: ["Vada Pav", "Pickle", "Chilli + Red & Green Chutney", "Tea/Coffee"],
    dinner: ["Chhola", "Puri", "Aloo Beans", "Rice", "Roti", "Lung Laddu"]
  },
  Wednesday: {
    breakfast: ["Mix Paratha", "Butter", "Chutney", "Corn Flakes", "Moong Sprouts"],
    lunch: ["Lauki Aloo", "Dry Soya Chunks", "Panchratan Dal", "Boondi Raita", "Chips"],
    snacks: ["Pasta", "Tea/Coffee"],
    dinner: ["Veg Paneer Kali Mirch Matar", "Jeera Rice", "Roti", "Arhar Dal", "Achar"]
  },
  Thursday: {
    breakfast: ["Uttapam", "Idli", "Sambhar", "Coconut Chutney", "Banana", "Chana Salted"],
    lunch: ["Kathol", "Methi Phulki", "Tomato Salad", "Rice", "Papad", "Dal Makhani", "Paratha"],
    snacks: ["Aloo Corn Sandwich", "Tea/Coffee"],
    dinner: ["Veg Kofta", "Paneer Bhurji", "Rice", "Roti", "Gulab Jamun"]
  },
  Friday: {
    breakfast: ["Paneer Paratha", "Butter", "Corn Flakes", "Chana"],
    lunch: ["Matar Mushroom Dry", "Kadi Pakoda", "Masoor Dal Fry", "Papad"],
    snacks: ["Poha", "Tea/Coffee"],
    dinner: ["Veg Kadai Paneer", "Dal Fry", "Roti", "Rice", "Pickle"]
  },
  Saturday: {
    breakfast: ["Methi Puri", "Bhaji", "Aloo", "Namkeen", "Banana", "Chana Sprouts"],
    lunch: ["Aloo Ko Chokha Seasonal Veg", "Papad", "Kadhi", "Curd", "Rice", "French Fries"],
    snacks: ["Pav Bhaji", "Tea/Coffee"],
    dinner: ["Matar Paneer", "Roti", "Rice", "Boondi Raita", "Moong Dal"]
  },
  Sunday: {
    breakfast: ["Masala Dosa", "Chutney", "Sambar", "Cornflakes", "Sprouts", "Bread", "Butter", "Jam"],
    lunch: ["Chole Bhature", "Jeera Aloo", "Dal", "Papad", "Dahi", "Achar"],
    snacks: ["Aloo Tikki", "Sauce", "Tea/Coffee"],
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
    await menuRef.set(messMenu);
    console.log('✅ Menu initialized in Firestore');
  } catch (error) {
    console.error('❌ Error initializing menu:', error);
  }
}
// TEMP: Manually trigger Firestore initialization
app.get("/init-menu", async (req, res) => {
  await initializeMenu();
  await initializeDishVotes();
  res.send("Initialized menu and votes in Firestore");
});


// Initialize dish votes in Firestore
async function initializeDishVotes() {
  try {
    const allDishes = new Set(); // use Set to avoid duplicates

    // Loop through each day's meals and collect unique dishes
    for (let dayMeals of Object.values(messMenu)) {
      for (let items of Object.values(dayMeals)) {
        for (let dish of items) {
          allDishes.add(dish);
        }
      }
    }

    for (let dish of allDishes) {
      const safeDishId = dish.replace(/\//g, "_"); // Firestore-safe ID
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
      displayName: userInfo.name,
      photoURL: userInfo.picture,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

// API to save user profile (called after login)
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
    const fullMenu = menuDoc.data();
    const todayMenu = fullMenu[today] || {};
    
    // Get all vote counts
    const votesSnapshot = await db.collection('dishVotes').get();
    const votesMap = {};
    
    votesSnapshot.forEach(doc => {
      const data = doc.data();
      votesMap[data.item] = { like: data.like, dislike: data.dislike };
    });
    
    res.json({ menu: todayMenu, votes: votesMap, day: today });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// Vote API — like/dislike any item (requires authentication)
app.post("/vote", verifyToken, async (req, res) => {
  const { item, type } = req.body;
  const userId = req.user.uid;
  
  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid vote type" });
  }
  
  try {
    // Check if user already voted for this item
    const userVoteRef = db.collection('userVotes').doc(`${userId}_${item}`);
    const userVoteDoc = await userVoteRef.get();
    
    const dishVoteRef = db.collection('dishVotes').doc(item);
    const dishVoteDoc = await dishVoteRef.get();
    
    if (!dishVoteDoc.exists) {
      return res.status(400).json({ success: false, message: "Item not found" });
    }
    
    let currentVote = null;
    if (userVoteDoc.exists) {
      currentVote = userVoteDoc.data().voteType;
    }
    
    // If user is voting the same type again, remove the vote
    if (currentVote === type) {
      await userVoteRef.delete();
      await dishVoteRef.update({
        [type]: admin.firestore.FieldValue.increment(-1)
      });
    } 
    // If user is changing vote type
    else if (currentVote && currentVote !== type) {
      await userVoteRef.set({
        userId,
        item,
        voteType: type,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      await dishVoteRef.update({
        [currentVote]: admin.firestore.FieldValue.increment(-1),
        [type]: admin.firestore.FieldValue.increment(1)
      });
    }
    // New vote
    else {
      await userVoteRef.set({
        userId,
        item,
        voteType: type,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      await dishVoteRef.update({
        [type]: admin.firestore.FieldValue.increment(1)
      });
    }
    
    // Get updated vote counts
    const updatedDoc = await dishVoteRef.get();
    const updatedData = updatedDoc.data();
    
    res.json({ 
      success: true, 
      updated: { like: updatedData.like, dislike: updatedData.dislike },
      userVote: currentVote === type ? null : type
    });
    
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get user's votes
app.get("/user-votes", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userVotesSnapshot = await db.collection('userVotes')
      .where('userId', '==', userId)
      .get();
    
    const userVotes = {};
    userVotesSnapshot.forEach(doc => {
      const data = doc.data();
      userVotes[data.item] = data.voteType;
    });
    
    res.json(userVotes);
  } catch (error) {
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
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Initialize data
initializeMenu();
initializeDishVotes();

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
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
