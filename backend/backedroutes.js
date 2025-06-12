const express = require("express");
const router = express.Router();
const { admin, db } = require("./firebaseAdmin");

// 🔧 Normalize helper
const normalizeDocId = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");

// Admin Login
router.post("/admin-login", async (req, res) => {
  const { adminId, password } = req.body;
  const doc = await db.collection("admins").doc(adminId).get();

  if (!doc.exists || doc.data().password !== password) {
    return res.json({ success: false });
  }

  return res.json({ success: true });
});

// Admin sets or updates special menu
router.post("/admin-dashboard", async (req, res) => {
  const { items } = req.body;
  const batch = db.batch();

  items.forEach(item => {
    const docRef = db.collection("specialMenu").doc(normalizeDocId(item.name));
    batch.set(docRef, item, { merge: true });
  });

  await batch.commit();
  res.json({ success: true });
});

// Admin fetches all special menu items
router.get("/admin-dashboard", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu").get();
    const items = snapshot.docs.map(doc => doc.data());
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin items" });
  }
});

// Admin deletes a dish - FIXED VERSION
router.delete("/admin-dashboard/:dishName", async (req, res) => {
  const dishNameRaw = decodeURIComponent(req.params.dishName);
  const normalizedDishName = normalizeDocId(dishNameRaw);

  console.log("Delete request received:");
  console.log("- Original dish name:", dishNameRaw);
  console.log("- Normalized dish name:", normalizedDishName);

  try {
    // Delete from specialMenu using normalized name (this is how it's stored)
    const deleteResult = await db.collection("specialMenu").doc(normalizedDishName).delete();
    console.log("✅ Deleted from specialMenu");

    // Delete from cafeDishVotes using normalized name
    await db.collection("cafeDishVotes").doc(normalizedDishName).delete();
    console.log("✅ Deleted from cafeDishVotes");

    // Clean up user votes - remove this dish from all user vote documents
    const userVotesSnapshot = await db.collection("cafeUserVotes").get();
    const batch = db.batch();
    
    let updatedUserVotes = 0;
    userVotesSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData[normalizedDishName]) {
        delete userData[normalizedDishName];
        batch.set(doc.ref, userData);
        updatedUserVotes++;
      }
    });

    if (updatedUserVotes > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${updatedUserVotes} user vote records`);
    }

    res.json({ 
      success: true, 
      message: "Item deleted successfully",
      deletedItem: dishNameRaw,
      normalizedName: normalizedDishName
    });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ 
      error: "Failed to delete item", 
      details: err.message,
      dishName: dishNameRaw,
      normalizedName: normalizedDishName
    });
  }
});

// User gets today's available menu
router.get("/auntys-cafe", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu")
      .where("available", "==", true)
      .get();

    const items = snapshot.docs.map(doc => doc.data());
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// /vote — only voting logic
router.post("/vote", async (req, res) => {
  const { userId, dishName, vote } = req.body;
  const normalizedDishName = normalizeDocId(dishName);
  const dishRef = db.collection("cafeDishVotes").doc(normalizedDishName);
  const userRef = db.collection("cafeUserVotes").doc(userId);

  try {
    const userDoc = await userRef.get();
    const userVotes = userDoc.exists ? userDoc.data() : {};

    if (userVotes[normalizedDishName]) {
      return res.status(400).json({ error: "User has already voted for this dish." });
    }

    await dishRef.set({}, { merge: true }); // Ensure doc exists

    await userRef.set({
      [normalizedDishName]: {
        voted: true,
        type: vote
      }
    }, { merge: true });

    await dishRef.update({
      [vote === "like" ? "likes" : "dislikes"]: admin.firestore.FieldValue.increment(1)
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Vote error", err);
    res.status(500).json({ error: "Voting failed" });
  }
});

// /feedback — only feedback logic
router.post("/feedback", async (req, res) => {
  const { userId, dishName, comment } = req.body;
  const normalizedDishName = normalizeDocId(dishName);
  const dishRef = db.collection("cafeDishVotes").doc(normalizedDishName);

  if (!comment || comment.trim() === "") {
    return res.status(400).json({ error: "Empty comment not allowed" });
  }

  try {
    await dishRef.set({}, { merge: true }); // Ensure doc exists

    await dishRef.update({
      comments: admin.firestore.FieldValue.arrayUnion({
        userId,
        comment,
        timestamp: new Date().toISOString()
      })
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback error", err);
    res.status(500).json({ error: "Feedback failed" });
  }
});

// Get like/dislike counts for all dishes
router.get("/dish-votes", async (req, res) => {
  try {
    const snapshot = await db.collection("cafeDishVotes").get();
    const votes = {};
    snapshot.forEach(doc => {
      votes[doc.id] = doc.data();
    });
    res.json({ votes });
  } catch (err) {
    console.error("Error fetching votes", err);
    res.status(500).json({ error: "Failed to fetch votes" });
  }
});

// ✅ ADDED: Frontend fetch today's menu
router.get("/menu", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu")
      .where("available", "==", true)
      .get();

    const items = snapshot.docs.map(doc => doc.data());
    res.json({ items });
  } catch (err) {
    console.error("Menu fetch error", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// ✅ ADDED: Frontend fetch user's previous votes
router.get("/user-votes/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const doc = await db.collection("cafeUserVotes").doc(userId).get();
    const votes = doc.exists ? doc.data() : {};
    res.json({ votes });
  } catch (err) {
    console.error("User votes fetch error", err);
    res.status(500).json({ error: "Failed to fetch user votes" });
  }
});

// ✅ FINAL export
module.exports = router;