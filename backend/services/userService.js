const { admin, db } = require("../config/firebase");
const { userVotesCache } = require("./cacheService");

async function saveUserProfile(userInfo) {
  try {
    const cacheKey = `user_save_${userInfo.uid}`;
    if (userVotesCache.get(cacheKey)) {
      return { cached: true };
    }

    const userRef = db.collection("users").doc(userInfo.uid);
    const existingUserDoc = await userRef.get();
    const userData = {
      uid: userInfo.uid,
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      photoURL: userInfo.picture || null,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existingUserDoc.exists) {
      userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await userRef.set(userData, { merge: true });
    userVotesCache.set(cacheKey, true, 300);

    return { saved: true };
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

module.exports = {
  saveUserProfile,
};
