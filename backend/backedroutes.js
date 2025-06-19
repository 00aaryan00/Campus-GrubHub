const express = require("express");
const router = express.Router();
const { admin, db } = require("./firebaseAdmin");
const { v4: uuidv4 } = require("uuid");

const normalizeDocId = (name) => name.trim().toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");

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

router.post("/admin-dashboard", async (req, res) => {
  try {
    const { items } = req.body;
    const batch = db.batch();

    for (const item of items) {
      const normalizedName = normalizeDocId(item.name);
      const docRef = db.collection("specialMenu").doc(normalizedName);
      const doc = await docRef.get();
      let availabilityHistory = item.availabilityHistory || [];
      let dishId = item.dishId || uuidv4();

      if (doc.exists) {
        const existingData = doc.data();
        availabilityHistory = existingData.availabilityHistory || availabilityHistory;
        dishId = existingData.dishId || dishId;
        const lastPeriod = availabilityHistory[availabilityHistory.length - 1];

        if (lastPeriod && item.available && lastPeriod.availableTo !== null) {
          availabilityHistory.push({
            availableFrom: new Date().toISOString(),
            availableTo: null,
          });
        } else if (lastPeriod && !item.available && lastPeriod.availableTo === null) {
          lastPeriod.availableTo = new Date().toISOString();
        }
      } else if (item.available) {
        availabilityHistory = [{ availableFrom: new Date().toISOString(), availableTo: null }];
      } else {
        availabilityHistory = [
          { availableFrom: new Date().toISOString(), availableTo: new Date().toISOString() },
        ];
      }

      batch.set(
        docRef,
        {
          ...item,
          dishId,
          availabilityHistory,
        },
        { merge: true }
      );
    }

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating menu:", err);
    res.status(500).json({ success: false, error: "Failed to update menu" });
  }
});

router.delete("/admin-dashboard", async (req, res) => {
  try {
    const { dishName, dishId } = req.body;
    if (!dishName || !dishId) {
      return res.status(400).json({ success: false, error: "Dish name and ID are required" });
    }

    const normalizedName = normalizeDocId(dishName);
    const batch = db.batch();

    // Delete from specialMenu
    const specialMenuRef = db.collection("specialMenu").doc(normalizedName);
    batch.delete(specialMenuRef);

    // Delete from cafeDishVotes
    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);
    batch.delete(dishVotesRef);

    // Delete user votes for this dish
    const userVotesSnapshot = await db.collection("cafeUserVotes").get();
    for (const userDoc of userVotesSnapshot.docs) {
      const userData = userDoc.data();
      if (userData[normalizedName]) {
        batch.update(db.collection("cafeUserVotes").doc(userDoc.id), {
          [normalizedName]: admin.firestore.FieldValue.delete(),
        });
      }
    }

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting dish:", err);
    res.status(500).json({ success: false, error: "Failed to delete dish" });
  }
});

router.get("/admin-dashboard", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu").get();
    const items = snapshot.docs.map((doc) => doc.data());
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

router.get("/menu", async (req, res) => {
  try {
    const snapshot = await db.collection("specialMenu").where("available", "==", true).get();
    res.json({
      success: true,
      items: snapshot.docs.map((doc) => doc.data()),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

router.post("/vote", async (req, res) => {
  try {
    const { userId, dishName, dishId, vote } = req.body;
    const normalizedName = normalizeDocId(dishName);

    let userName = "Anonymous";
    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (authError) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const dishRef = db.collection("specialMenu").doc(normalizedName);
    const dishDoc = await dishRef.get();
    let availabilityTimestamp = new Date().toISOString();
    let finalDishId = dishId;

    if (!dishDoc.exists) {
      finalDishId = dishId || uuidv4();
      await dishRef.set({
        dishId: finalDishId,
        name: dishName,
        price: 0,
        veg: true,
        available: false,
        availabilityHistory: [
          { availableFrom: availabilityTimestamp, availableTo: availabilityTimestamp },
        ],
      });
    } else {
      finalDishId = dishDoc.data().dishId;
      const availabilityHistory = dishDoc.data().availabilityHistory || [];
      const currentPeriod = availabilityHistory.find((period) => period.availableTo === null);
      availabilityTimestamp = currentPeriod?.availableFrom || availabilityTimestamp;
    }

    const userVotesRef = db.collection("cafeUserVotes").doc(userId);
    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);

    await db.runTransaction(async (t) => {
      const userVotesDoc = await t.get(userVotesRef);
      const existingVote = userVotesDoc.exists ? userVotesDoc.data()[normalizedName] : null;

      if (existingVote && existingVote.availabilityTimestamp === availabilityTimestamp) {
        if (existingVote.type === "like") {
          t.update(dishVotesRef, {
            likes: admin.firestore.FieldValue.increment(-1),
          });
        } else if (existingVote.type === "dislike") {
          t.update(dishVotesRef, {
            dislikes: admin.firestore.FieldValue.increment(-1),
          });
        }
      }

      t.set(
        userVotesRef,
        {
          [normalizedName]: {
            type: vote,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userName,
            dishId: finalDishId,
            availabilityTimestamp,
          },
        },
        { merge: true }
      );

      t.set(
        dishVotesRef,
        {
          dishName,
          dishId: finalDishId,
          price: dishDoc.exists ? dishDoc.data().price : 0,
          veg: dishDoc.exists ? dishDoc.data().veg : true,
          likes: admin.firestore.FieldValue.increment(vote === "like" ? 1 : 0),
          dislikes: admin.firestore.FieldValue.increment(vote === "dislike" ? 1 : 0),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Vote Error:", err);
    res.status(500).json({
      success: false,
      error: "Voting failed",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const { userId, dishName, dishId, comment } = req.body;
    if (!userId || !dishName || !comment?.trim() || !dishId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields or empty comment",
      });
    }

    let userName = "Anonymous";
    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (authError) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const normalizedName = normalizeDocId(dishName);
    const dishRef = db.collection("specialMenu").doc(normalizedName);
    const dishDoc = await dishRef.get();
    let availabilityTimestamp = new Date().toISOString();
    let finalDishId = dishId;

    if (!dishDoc.exists) {
      finalDishId = dishId || uuidv4();
      await dishRef.set({
        dishId: finalDishId,
        name: dishName,
        price: 0,
        veg: true,
        available: false,
        availabilityHistory: [
          { availableFrom: availabilityTimestamp, availableTo: availabilityTimestamp },
        ],
      });
    } else {
      finalDishId = dishDoc.data().dishId;
      const availabilityHistory = dishDoc.data().availabilityHistory || [];
      const currentPeriod = availabilityHistory.find((period) => period.availableTo === null);
      availabilityTimestamp = currentPeriod?.availableFrom || availabilityTimestamp;
    }

    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);
    const feedbackData = {
      userId,
      userName,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      dishName,
      dishId: finalDishId,
      availabilityTimestamp,
      price: dishDoc.exists ? dishDoc.data().price : 0,
      veg: dishDoc.exists ? dishDoc.data().veg : true,
    };

    await db.runTransaction(async (t) => {
      const dishDoc = await t.get(dishVotesRef);
      if (!dishDoc.exists) {
        t.set(dishVotesRef, {
          dishName,
          dishId: finalDishId,
          price: dishDoc.exists ? dishDoc.data().price : 0,
          veg: dishDoc.exists ? dishDoc.data().veg : true,
          likes: 0,
          dislikes: 0,
          comments: [feedbackData],
        });
      } else {
        t.update(dishVotesRef, {
          comments: admin.firestore.FieldValue.arrayUnion(feedbackData),
        });
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to submit feedback",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get("/dish-votes", async (req, res) => {
  try {
    const dishVotesSnapshot = await db.collection("cafeDishVotes").get();
    const votes = {};

    for (const doc of dishVotesSnapshot.docs) {
      const data = doc.data();
      const normalizedName = doc.id;
      const dishRef = db.collection("specialMenu").doc(normalizedName);
      const dishDoc = await dishRef.get();

      let currentAvailabilityTimestamp = data.comments?.[0]?.timestamp || "2025-01-01T00:00:00Z";
      if (dishDoc.exists) {
        const availabilityHistory = dishDoc.data().availabilityHistory || [];
        const currentPeriod = availabilityHistory.find((period) => period.availableTo === null);
        currentAvailabilityTimestamp = currentPeriod?.availableFrom || currentAvailabilityTimestamp;
      }

      const currentComments = (data.comments || []).filter(
        (comment) =>
          comment.availabilityTimestamp === currentAvailabilityTimestamp ||
          !comment.availabilityTimestamp
      );
      const pastComments = (data.comments || []).filter(
        (comment) =>
          comment.availabilityTimestamp &&
          comment.availabilityTimestamp !== currentAvailabilityTimestamp
      );

      votes[normalizedName] = {
        dishName: data.dishName,
        dishId: data.dishId,
        price: data.price || 0,
        veg: data.veg !== undefined ? data.veg : true,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        currentComments,
        pastComments,
      };
    }

    res.json({ success: true, votes });
  } catch (err) {
    console.error("Error fetching votes:", err);
    res.status(500).json({ success: false, error: "Failed to fetch votes" });
  }
});

router.get("/user-votes/:userId", async (req, res) => {
  try {
    const doc = await db.collection("cafeUserVotes").doc(req.params.userId).get();
    res.json({
      success: true,
      votes: doc.exists ? doc.data() : {},
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch user votes" });
  }
});

module.exports = router;