function getSafeDishId(item) {
  return item.replace(/\//g, "_");
}

function getDailyVotesDateRef(db, dateKey) {
  return db.collection("dailyDishVotes").doc(dateKey);
}

function getDailyDishVoteRef(db, dateKey, safeDishId) {
  return getDailyVotesDateRef(db, dateKey).collection("items").doc(safeDishId);
}

module.exports = {
  getSafeDishId,
  getDailyVotesDateRef,
  getDailyDishVoteRef,
};
