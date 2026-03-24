const { admin, db } = require("../config/firebase");
const messMenu = require("../data/messMenu");
const { menuCache } = require("./cacheService");
const { getCurrentDateKey, getCurrentDayName } = require("../utils/time");
const { getDailyVotesDateRef, getDailyDishVoteRef, getSafeDishId } = require("../utils/messVoteKeys");

async function initializeMenu() {
  try {
    const cacheKey = "menu_initialized";
    if (menuCache.get(cacheKey)) {
      console.log("Menu initialization skipped (cached)");
      return;
    }

    const menuRef = db.collection("menu").doc("weekly");
    const doc = await menuRef.get();

    if (!doc.exists) {
      await menuRef.set(messMenu);
      console.log("Menu initialized in Firestore");
    } else {
      console.log("Menu already exists in Firestore, skipping initialization");
    }

    menuCache.set(cacheKey, true, 86400);
  } catch (error) {
    console.error("Error initializing menu:", error);
  }
}

async function initializeDishVotes() {
  try {
    const dateKey = getCurrentDateKey();
    const day = getCurrentDayName();
    const cacheKey = `votes_initialized_${dateKey}`;
    if (menuCache.get(cacheKey)) {
      console.log("Dish votes initialization skipped (cached)");
      return;
    }

    const allDishes = new Set();
    for (const dayMeals of Object.values(messMenu)) {
      for (const items of Object.values(dayMeals)) {
        for (const dish of items) {
          allDishes.add(dish);
        }
      }
    }

    let batch = db.batch();
    let batchCount = 1;
    const dateRef = getDailyVotesDateRef(db, dateKey);

    batch.set(
      dateRef,
      {
        dateKey,
        day,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    for (const dish of allDishes) {
      const safeDishId = getSafeDishId(dish);
      const dishRef = getDailyDishVoteRef(db, dateKey, safeDishId);
      const doc = await dishRef.get();

      if (!doc.exists) {
        batch.set(dishRef, {
          item: dish,
          dishId: safeDishId,
          day,
          dateKey,
          like: 0,
          dislike: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    menuCache.set(cacheKey, true, 86400);
    console.log("Dish votes initialized in Firestore");
  } catch (error) {
    console.error("Error initializing dish votes:", error);
  }
}

module.exports = {
  initializeMenu,
  initializeDishVotes,
};
