const quotes = require("../data/quotes");
const { getDailyQuoteCache, setDailyQuoteCache } = require("../services/cacheService");
const { getCurrentDateKey, getDayOfMonth } = require("../utils/time");

function getRoot(req, res) {
  res.status(200).json({
    ok: true,
    service: "Campus-GrubHub API",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

function getHealth(req, res) {
  res.status(200).send("ok");
}

function getDailyQuote(req, res) {
  const today = getCurrentDateKey();
  const cachedQuote = getDailyQuoteCache();

  if (cachedQuote.quote && cachedQuote.date === today) {
    return res.json({ quote: cachedQuote.quote });
  }

  const quote = quotes[getDayOfMonth() % quotes.length];
  setDailyQuoteCache({ quote, date: today });
  res.json({ quote });
}

module.exports = {
  getRoot,
  getHealth,
  getDailyQuote,
};
