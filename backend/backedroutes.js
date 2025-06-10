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

// Admin sets menu
router.post("/admin-dashboard", async (req, res) => {
  const { date, items } = req.body;
  await db.collection("cafeMenu").doc(date).set({
    items,
    lastUpdatedAt: new Date().toISOString()
  });
  res.json({ success: true });
});

// User gets today’s special menu
router.get("/auntys-cafe", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const doc = await db.collection("cafeMenu").doc(today).get();

  if (!doc.exists) return res.json({ items: [] });
  res.json(doc.data());
});

// User votes or comments
router.post("/vote", async (req, res) => {
  const { userId, dishName, vote, comment } = req.body;
 const dishRef = db.collection("cafeDishVotes").doc(dishName);
const userRef = db.collection("cafeUserVotes").doc(userId);

  if (vote) {
    const alreadyVoted = (await userRef.get()).data()?.[dishName];
    if (!alreadyVoted) {
      await dishRef.set({
        likes: vote === "like" ? 1 : 0,
        dislikes: vote === "dislike" ? 1 : 0,
        comments: [],
      }, { merge: true });

      await userRef.set({ [dishName]: { liked: vote === "like", disliked: vote === "dislike" } }, { merge: true });

      await dishRef.update({
        [vote === "like" ? "likes" : "dislikes"]: admin.firestore.FieldValue.increment(1)
      });
    }
  }

  if (comment) {
    await dishRef.update({
      comments: admin.firestore.FieldValue.arrayUnion({ userId, comment })
    });
  }

  res.json({ success: true });
});

module.exports = router;
