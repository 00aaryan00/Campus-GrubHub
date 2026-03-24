const NodeCache = require("node-cache");

const menuCache = new NodeCache({ stdTTL: 3600 });
const votesCache = new NodeCache({ stdTTL: 300 });
const userVotesCache = new NodeCache({ stdTTL: 600 });
const leaderboardCache = new NodeCache({ stdTTL: 900 });

let dailyQuoteCache = {
  quote: null,
  date: null,
};

function getDailyQuoteCache() {
  return dailyQuoteCache;
}

function setDailyQuoteCache(value) {
  dailyQuoteCache = value;
}

module.exports = {
  menuCache,
  votesCache,
  userVotesCache,
  leaderboardCache,
  getDailyQuoteCache,
  setDailyQuoteCache,
};
