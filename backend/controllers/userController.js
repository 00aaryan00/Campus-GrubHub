const { db } = require("../config/firebase");
const { userVotesCache } = require("../services/cacheService");
const { saveUserProfile } = require("../services/userService");

async function saveUser(req, res) {
  try {
    const result = await saveUserProfile(req.user);
    res.json({
      success: true,
      message: result.cached ? "User profile recently saved" : "User profile saved",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save user profile" });
  }
}

async function getUserProfile(req, res) {
  try {
    const cacheKey = `profile_${req.user.uid}`;
    let userProfile = userVotesCache.get(cacheKey);

    if (!userProfile) {
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      userProfile = userDoc.data();
      userVotesCache.set(cacheKey, userProfile);
    }

    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
}

module.exports = {
  saveUser,
  getUserProfile,
};
