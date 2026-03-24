const { admin, db } = require("../config/firebase");
const normalizeDocId = require("../utils/normalizeDocId");

async function getCafeMenu(req, res) {
  try {
    const snapshot = await db.collection("specialMenu").where("available", "==", true).get();
    res.json({
      success: true,
      items: snapshot.docs.map((doc) => doc.data()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
}

async function voteOnCafeDish(req, res) {
  try {
    const { userId, dishName, dishId, vote } = req.body;
    if (!userId || req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "User mismatch" });
    }
    if (!["like", "dislike"].includes(vote)) {
      return res.status(400).json({ success: false, error: "Invalid vote type" });
    }

    const normalizedName = normalizeDocId(dishName);
    let userName = "Anonymous";

    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (error) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const dishRef = db.collection("specialMenu").doc(normalizedName);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ success: false, error: "Dish not found" });
    }

    const availabilityHistory = dishDoc.data().availabilityHistory || [];
    const currentPeriod = availabilityHistory.find((period) => period.availableTo === null);
    const availabilityTimestamp = currentPeriod?.availableFrom || new Date().toISOString();
    const finalDishId = dishDoc.data().dishId || dishId;

    const userVotesRef = db.collection("cafeUserVotes").doc(userId);
    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);

    await db.runTransaction(async (transaction) => {
      const userVotesDoc = await transaction.get(userVotesRef);
      const existingVote = userVotesDoc.exists ? userVotesDoc.data()[normalizedName] : null;

      if (existingVote && existingVote.availabilityTimestamp === availabilityTimestamp) {
        if (existingVote.type === "like") {
          transaction.update(dishVotesRef, {
            likes: admin.firestore.FieldValue.increment(-1),
          });
        } else if (existingVote.type === "dislike") {
          transaction.update(dishVotesRef, {
            dislikes: admin.firestore.FieldValue.increment(-1),
          });
        }
      }

      transaction.set(
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

      transaction.set(
        dishVotesRef,
        {
          dishName,
          dishId: finalDishId,
          price: dishDoc.data().price || 0,
          veg: dishDoc.data().veg !== undefined ? dishDoc.data().veg : true,
          likes: admin.firestore.FieldValue.increment(vote === "like" ? 1 : 0),
          dislikes: admin.firestore.FieldValue.increment(vote === "dislike" ? 1 : 0),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Vote Error:", error);
    res.status(500).json({
      success: false,
      error: "Voting failed",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function submitCafeFeedback(req, res) {
  try {
    const { userId, dishName, dishId, comment } = req.body;
    if (!userId || !dishName || !comment?.trim() || !dishId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields or empty comment",
      });
    }
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "User mismatch" });
    }

    let userName = "Anonymous";
    try {
      const userRecord = await admin.auth().getUser(userId);
      userName = userRecord.displayName || userRecord.email || "Anonymous";
    } catch (error) {
      console.log("Could not fetch user from auth, using anonymous");
    }

    const normalizedName = normalizeDocId(dishName);
    const dishRef = db.collection("specialMenu").doc(normalizedName);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return res.status(404).json({ success: false, error: "Dish not found" });
    }

    const availabilityHistory = dishDoc.data().availabilityHistory || [];
    const currentPeriod = availabilityHistory.find((period) => period.availableTo === null);
    const availabilityTimestamp = currentPeriod?.availableFrom || new Date().toISOString();
    const finalDishId = dishDoc.data().dishId || dishId;
    const dishVotesRef = db.collection("cafeDishVotes").doc(normalizedName);

    const feedbackData = {
      userId,
      userName,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      dishName,
      dishId: finalDishId,
      availabilityTimestamp,
      price: dishDoc.data().price || 0,
      veg: dishDoc.data().veg !== undefined ? dishDoc.data().veg : true,
    };

    await db.runTransaction(async (transaction) => {
      const dishVotesDoc = await transaction.get(dishVotesRef);
      if (!dishVotesDoc.exists) {
        transaction.set(dishVotesRef, {
          dishName,
          dishId: finalDishId,
          price: dishDoc.data().price || 0,
          veg: dishDoc.data().veg !== undefined ? dishDoc.data().veg : true,
          likes: 0,
          dislikes: 0,
          comments: [feedbackData],
        });
      } else {
        transaction.update(dishVotesRef, {
          comments: admin.firestore.FieldValue.arrayUnion(feedbackData),
        });
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit feedback",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function getCafeDishVotes(req, res) {
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
        (comment) => comment.availabilityTimestamp === currentAvailabilityTimestamp || !comment.availabilityTimestamp
      );
      const pastComments = (data.comments || []).filter(
        (comment) =>
          comment.availabilityTimestamp && comment.availabilityTimestamp !== currentAvailabilityTimestamp
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
  } catch (error) {
    console.error("Error fetching votes:", error);
    res.status(500).json({ success: false, error: "Failed to fetch votes" });
  }
}

async function getCafeUserVotes(req, res) {
  try {
    if (req.user.uid !== req.params.userId) {
      return res.status(403).json({ success: false, error: "User mismatch" });
    }

    const doc = await db.collection("cafeUserVotes").doc(req.params.userId).get();
    res.json({
      success: true,
      votes: doc.exists ? doc.data() : {},
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch user votes" });
  }
}

module.exports = {
  getCafeMenu,
  voteOnCafeDish,
  submitCafeFeedback,
  getCafeDishVotes,
  getCafeUserVotes,
};
