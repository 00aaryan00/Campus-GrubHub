const { admin, db } = require("../config/firebase");
const messMenu = require("../data/messMenu");
const {
  menuCache,
  votesCache,
  userVotesCache,
  leaderboardCache,
} = require("../services/cacheService");
const { initializeMenu, initializeDishVotes } = require("../services/menuInitializationService");
const { getCurrentDayName, getCurrentDateKey } = require("../utils/time");
const { getDailyVotesDateRef, getDailyDishVoteRef, getSafeDishId } = require("../utils/messVoteKeys");

async function getMenu(req, res) {
  try {
    const today = getCurrentDayName();
    const dateKey = getCurrentDateKey();
    const cacheKey = `menu_${dateKey}`;
    const cachedData = menuCache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const todayMenu = messMenu[today] || {};
    const votesCacheKey = `votes_${dateKey}`;
    let votesMap = votesCache.get(votesCacheKey);

    if (!votesMap) {
      const allTodayItems = Object.values(todayMenu).flat();
      const voteRefs = allTodayItems.map((item) => {
        const safeDishId = getSafeDishId(item);
        return getDailyDishVoteRef(db, dateKey, safeDishId);
      });
      const voteDocs = voteRefs.length > 0 ? await db.getAll(...voteRefs) : [];
      votesMap = {};

      voteDocs.forEach((doc, index) => {
        const item = allTodayItems[index];
        if (doc.exists) {
          const data = doc.data();
          votesMap[item] = { like: data.like || 0, dislike: data.dislike || 0 };
        } else {
          votesMap[item] = { like: 0, dislike: 0 };
        }
      });

      votesCache.set(votesCacheKey, votesMap);
    }

    const responseData = { menu: todayMenu, votes: votesMap, day: today };
    menuCache.set(cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
}

async function voteOnDish(req, res) {
  const { item, type, day, timestamp } = req.body;
  const userId = req.user.uid;

  if (!["like", "dislike", "neutral"].includes(type)) {
    return res.status(400).json({ error: "Invalid vote type" });
  }

  const today = getCurrentDayName();
  const dateKey = getCurrentDateKey();
  if (day !== today) {
    return res.status(400).json({ error: "Vote submitted for incorrect day" });
  }

  try {
    const safeDishId = getSafeDishId(item);
    const userVoteRef = db.collection("userVotes").doc(`${userId}_${safeDishId}_${dateKey}`);
    const dateRef = getDailyVotesDateRef(db, dateKey);
    const dishVoteRef = getDailyDishVoteRef(db, dateKey, safeDishId);

    await db.runTransaction(async (transaction) => {
      const [userVoteDoc, dishVoteDoc] = await Promise.all([
        transaction.get(userVoteRef),
        transaction.get(dishVoteRef),
      ]);

      const dishVoteData = dishVoteDoc.exists
        ? dishVoteDoc.data()
        : {
            item,
            dishId: safeDishId,
            day: today,
            dateKey,
            like: 0,
            dislike: 0,
          };

      if (!dishVoteDoc.exists) {
        transaction.set(
          dateRef,
          {
            dateKey,
            day: today,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        transaction.set(dishVoteRef, {
          ...dishVoteData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const currentVote = userVoteDoc.exists ? userVoteDoc.data().voteType : null;
      const updates = {};

      if (currentVote === type && type !== "neutral") {
        transaction.delete(userVoteRef);
        updates[type] = admin.firestore.FieldValue.increment(-1);
      } else if (currentVote && type !== "neutral") {
        transaction.set(
          userVoteRef,
          {
            userId,
            item,
            voteType: type,
            day: today,
            dateKey,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        updates[currentVote] = admin.firestore.FieldValue.increment(-1);
        updates[type] = admin.firestore.FieldValue.increment(1);
      } else if (type !== "neutral") {
        transaction.set(userVoteRef, {
          userId,
          item,
          voteType: type,
          day: today,
          dateKey,
          timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
        });
        updates[type] = admin.firestore.FieldValue.increment(1);
      }

      if (Object.keys(updates).length > 0) {
        transaction.set(
          dishVoteRef,
          {
            ...updates,
            item: dishVoteData.item,
            dishId: dishVoteData.dishId,
            day: today,
            dateKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    votesCache.del(`votes_${dateKey}`);
    menuCache.del(`menu_${dateKey}`);
    userVotesCache.del(`user_votes_${userId}_${dateKey}`);
    leaderboardCache.del(`leaderboard_${dateKey}`);

    const updatedDishDoc = await dishVoteRef.get();
    const userVotesCacheKey = `user_votes_${userId}_${dateKey}`;
    let userVotesMap = userVotesCache.get(userVotesCacheKey);

    if (!userVotesMap) {
      const updatedUserVotes = await db
        .collection("userVotes")
        .where("userId", "==", userId)
        .where("dateKey", "==", dateKey)
        .get();

      userVotesMap = {};
      updatedUserVotes.forEach((doc) => {
        const data = doc.data();
        userVotesMap[data.item] = data.voteType;
      });

      userVotesCache.set(userVotesCacheKey, userVotesMap);
    }

    res.json({
      success: true,
      votes: {
        like: updatedDishDoc.data().like,
        dislike: updatedDishDoc.data().dislike,
      },
      userVotes: userVotesMap,
    });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ success: false, error: "Failed to record vote" });
  }
}

async function getUserVotes(req, res) {
  try {
    const userId = req.user.uid;
    const today = getCurrentDayName();
    const dateKey = getCurrentDateKey();
    const cacheKey = `user_votes_${userId}_${dateKey}`;
    let userVotes = userVotesCache.get(cacheKey);

    if (!userVotes) {
      const userVotesSnapshot = await db
        .collection("userVotes")
        .where("userId", "==", userId)
        .where("dateKey", "==", dateKey)
        .get();

      userVotes = {};
      userVotesSnapshot.forEach((doc) => {
        const data = doc.data();
        userVotes[data.item] = data.voteType;
      });

      userVotesCache.set(cacheKey, userVotes);
    }

    res.json(userVotes);
  } catch (error) {
    console.error("Error fetching user votes:", error);
    res.status(500).json({ error: "Failed to fetch user votes" });
  }
}

async function getLeaderboard(req, res) {
  try {
    const dateKey = getCurrentDateKey();
    const cacheKey = `leaderboard_${dateKey}`;
    let leaderboard = leaderboardCache.get(cacheKey);

    if (!leaderboard) {
      const votesSnapshot = await getDailyVotesDateRef(db, dateKey).collection("items").get();
      leaderboard = votesSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return { _id: data.item, count: data.like || 0 };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      leaderboardCache.set(cacheKey, leaderboard);
    }

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}

async function initializeMessData(req, res) {
  try {
    await initializeMenu();
    await initializeDishVotes();
    res.status(200).send("Menu and votes initialized");
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).send("Initialization failed");
  }
}

module.exports = {
  getMenu,
  voteOnDish,
  getUserVotes,
  getLeaderboard,
  initializeMessData,
};
