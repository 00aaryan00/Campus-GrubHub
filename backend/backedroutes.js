const express = require("express");
const router = express.Router();
const { admin, db } = require("./firebaseAdmin");

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
    const docRef = db.collection("specialMenu").doc(item.name.replace(/\//g, "_"));
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

// Admin deletes a dish
router.delete("/admin-dashboard/:dishName", async (req, res) => {
  const dishName = req.params.dishName.replace(/\//g, "_");

  try {
    await db.collection("specialMenu").doc(dishName).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete dish" });
  }
});

// User gets today’s available menu
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
  const dishRef = db.collection("cafeDishVotes").doc(dishName);
  const userRef = db.collection("cafeUserVotes").doc(userId);

  try {
    const userDoc = await userRef.get();
    const userVotes = userDoc.exists ? userDoc.data() : {};

    if (userVotes[dishName]) {
      return res.status(400).json({ error: "User has already voted for this dish." });
    }

    await dishRef.set({}, { merge: true }); // Ensure doc exists

    await userRef.set({
      [dishName]: {
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
  const dishRef = db.collection("cafeDishVotes").doc(dishName);

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
