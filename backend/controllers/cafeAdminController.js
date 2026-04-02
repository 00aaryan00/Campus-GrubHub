const { admin, db } = require("../config/firebase");
const normalizeDocId = require("../utils/normalizeDocId");
const { v4: uuidv4 } = require("uuid");
const { createAdminSessionToken } = require("../middlewares/adminSessionAuth");

async function adminLogin(req, res) {
  const { adminId, password } = req.body;

  try {
    const doc = await db.collection("admins").doc(adminId).get();
    if (!doc.exists || doc.data().password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = createAdminSessionToken(adminId);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: "Login failed" });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const snapshot = await db.collection("specialMenu").get();
    const items = snapshot.docs.map((doc) => doc.data());
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
}

async function updateAdminDashboard(req, res) {
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
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ success: false, error: "Failed to update menu" });
  }
}

async function deleteAdminDish(req, res) {
  try {
    const { dishName, dishId } = req.body;
    if (!dishName || !dishId) {
      return res.status(400).json({ success: false, error: "Dish name and ID are required" });
    }

    const normalizedName = normalizeDocId(dishName);
    const batch = db.batch();

    batch.delete(db.collection("specialMenu").doc(normalizedName));
    batch.delete(db.collection("cafeDishVotes").doc(normalizedName));

    const userVotesSnapshot = await db.collection("cafeUserVotes").get();
    for (const userDoc of userVotesSnapshot.docs) {
      const userVoteItemRef = db
        .collection("cafeUserVotes")
        .doc(userDoc.id)
        .collection("items")
        .doc(dishId);
      const userVoteItemDoc = await userVoteItemRef.get();

      if (userVoteItemDoc.exists) {
        batch.delete(userVoteItemRef);
      }
    }

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting dish:", error);
    res.status(500).json({ success: false, error: "Failed to delete dish" });
  }
}

module.exports = {
  adminLogin,
  getAdminDashboard,
  updateAdminDashboard,
  deleteAdminDish,
};
