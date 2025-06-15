const express = require("express");
const router = express.Router();
const { admin, db } = require("./firebaseAdmin");

// Helper function to normalize document IDs
const normalizeDocId = (name) => 
  name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");

/* ========== ADMIN ROUTES ========== */
router.post("/admin-login", async (req, res) => {
  const { adminId, password } = req.body;
  try {
    const doc = await db.collection("admins").doc(adminId).get();
    if (!doc.exists || doc.data().password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// Menu management
router.post("/admin-dashboard", async (req, res) => {
  try {
    const { items } = req.body;
    const batch = db.batch();
    
    items.forEach(item => {
      const docRef = db.collection("specialMenu").doc(normalizeDocId(item.name));
      batch.set(docRef, item, { merge: true });
    });

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update menu" });
  }
});

router.get("/admin-dashboard", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu").get();
    const items = snapshot.docs.map(doc => doc.data());
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

router.delete("/admin-dashboard/:dishName", async (req, res) => {
  try {
    const dishName = decodeURIComponent(req.params.dishName);
    const normalizedName = normalizeDocId(dishName);
    const batch = db.batch();

    // Delete from menu
    batch.delete(db.collection("specialMenu").doc(normalizedName));
    
    // Delete from votes
    batch.delete(db.collection("cafeDishVotes").doc(normalizedName));
    
    // Clean user votes
    const usersSnapshot = await db.collection("cafeUserVotes").get();
    usersSnapshot.forEach(doc => {
      if (doc.data()[normalizedName]) {
        const userRef = db.collection("cafeUserVotes").doc(doc.id);
        const updates = { [normalizedName]: admin.firestore.FieldValue.delete() };
        batch.update(userRef, updates);
      }
    });

    await batch.commit();
    res.json({ success: true, message: "Dish deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete dish" });
  }
});

/* ========== CAFE ROUTES ========== */
// Get available menu
router.get("/menu", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu")
      .where("available", "==", true)
      .get();
    res.json({ 
      success: true, 
      items: snapshot.docs.map(doc => doc.data()) 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

// Updated voting system endpoint
router.post("/vote", async (req, res) => {
  try {
    const { userId, dishName, vote } = req.body;
    const normalizedName = normalizeDocId(dishName);
    
    // Get user info from auth (Firebase Auth stores user info automatically)
    let userName = "Anonymous";
    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (authError) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const userVotesRef = db.collection("cafeUserVotes").doc(userId);
    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);

    // Check if user already voted for this dish
    const userVotesDoc = await userVotesRef.get();
    const existingVote = userVotesDoc.exists ? userVotesDoc.data()[normalizedName] : null;

    await db.runTransaction(async (t) => {
      if (existingVote) {
        // If changing vote, first decrement the previous vote count
        if (existingVote.type === 'like') {
          t.update(dishVotesRef, {
            likes: admin.firestore.FieldValue.increment(-1)
          });
        } else if (existingVote.type === 'dislike') {
          t.update(dishVotesRef, {
            dislikes: admin.firestore.FieldValue.increment(-1)
          });
        }
      }

      // Update user's vote record
      t.set(userVotesRef, { 
        [normalizedName]: { 
          type: vote,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userName: userName
        } 
      }, { merge: true });
      
      // Update dish vote counts
      t.set(dishVotesRef, {
        dishName: dishName, // Store original dish name
        likes: admin.firestore.FieldValue.increment(vote === "like" ? 1 : 0),
        dislikes: admin.firestore.FieldValue.increment(vote === "dislike" ? 1 : 0),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Voting failed",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Updated feedback endpoint
router.post("/feedback", async (req, res) => {
  try {
    const { userId, dishName, comment } = req.body;
    
    if (!userId || !dishName || !comment?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields or empty comment"
      });
    }

    // Get user info from Firebase Auth
    let userName = "Anonymous";
    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (authError) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const normalizedName = normalizeDocId(dishName);
    const dishRef = db.collection("cafeDishVotes").doc(normalizedName);

    // Create the feedback data with a client-side timestamp
    const feedbackData = {
      userId,
      userName: userName,
      comment: comment.trim(),
      timestamp: new Date().toISOString(), // Use client-side timestamp instead
      dishName: dishName
    };

    // Use a transaction to ensure atomic updates
    await db.runTransaction(async (t) => {
      const dishDoc = await t.get(dishRef);
      
      if (!dishDoc.exists) {
        t.set(dishRef, {
          dishName: dishName,
          likes: 0,
          dislikes: 0,
          comments: [feedbackData] // Initialize with first comment
        });
      } else {
        t.update(dishRef, {
          comments: admin.firestore.FieldValue.arrayUnion(feedbackData)
        });
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit feedback",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get vote counts
router.get("/dish-votes", async (req, res) => {
  try {
    const snapshot = await db.collection("cafeDishVotes").get();
    const votes = {};
    snapshot.forEach(doc => votes[doc.id] = doc.data());
    res.json({ success: true, votes });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch votes" });
  }
});

// Get user votes
router.get("/user-votes/:userId", async (req, res) => {
  try {
    const doc = await db.collection("cafeUserVotes").doc(req.params.userId).get();
    res.json({ 
      success: true, 
      votes: doc.exists ? doc.data() : {} 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch user votes" });
  }
});

module.exports = router;