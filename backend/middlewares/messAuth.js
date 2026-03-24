const crypto = require("crypto");
const { admin } = require("../config/firebase");
const { userVotesCache } = require("../services/cacheService");

function getTokenCacheKey(token) {
  return `token_${crypto.createHash("sha256").update(token).digest("hex")}`;
}

async function verifyMessToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const tokenCacheKey = getTokenCacheKey(token);
    let decodedToken = userVotesCache.get(tokenCacheKey);

    if (!decodedToken) {
      decodedToken = await admin.auth().verifyIdToken(token);
      userVotesCache.set(tokenCacheKey, decodedToken, 600);
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = verifyMessToken;
