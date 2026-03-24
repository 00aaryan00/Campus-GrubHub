const { admin } = require("../config/firebase");

async function verifyCafeToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

module.exports = verifyCafeToken;
