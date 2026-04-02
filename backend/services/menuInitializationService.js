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

    const todaysMenu = messMenu[day] || {};
    const allDishes = new Set(Object.values(todaysMenu).flat());
    const dateRef = getDailyVotesDateRef(db, dateKey);
    const dateDoc = await dateRef.get();

    if (dateDoc.exists) {
      const dateData = dateDoc.data();
      if (dateData?.day === day && dateData?.itemsInitialized === true) {
        menuCache.set(cacheKey, true, 86400);
        console.log("Dish votes already initialized in Firestore, skipping initialization");
        return;
      }
    }

    await dateRef.set(
      {
        dateKey,
        day,
        itemsInitialized: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    for (const dish of allDishes) {
      const safeDishId = getSafeDishId(dish);
      const dishRef = getDailyDishVoteRef(db, dateKey, safeDishId);
      try {
        await dishRef.create({
          item: dish,
          dishId: safeDishId,
          day,
          dateKey,
          like: 0,
          dislike: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        if (error.code !== 6 && error.code !== "already-exists") {
          throw error;
        }
      }
    }

    await dateRef.set(
      {
        dateKey,
        day,
        itemsInitialized: true,
        initializedDishCount: allDishes.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    menuCache.set(cacheKey, true, 86400);
    console.log("Dish votes initialized in Firestore");
  } catch (error) {
    console.error("Error initializing dish votes:", error);
  }
}

let messInitializationPromise = null;

function ensureMessDataInitialized() {
  if (!messInitializationPromise) {
    messInitializationPromise = (async () => {
      await initializeMenu();
      await initializeDishVotes();
    })().catch((error) => {
      messInitializationPromise = null;
      throw error;
    });
  }

  return messInitializationPromise;
}

module.exports = {
  initializeMenu,
  initializeDishVotes,
  ensureMessDataInitialized,
};
