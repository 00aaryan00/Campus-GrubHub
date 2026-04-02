const crypto = require("crypto");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", getAdminSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function createAdminSessionToken(adminId) {
  if (!getAdminSessionSecret()) {
    throw new Error("ADMIN_SESSION_SECRET or FIREBASE_ADMIN_PRIVATE_KEY is required");
  }

  const encodedPayload = encodePayload({
    adminId,
    exp: Date.now() + SESSION_TTL_MS,
  });

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifyAdminSessionToken(token) {
  if (!getAdminSessionSecret() || !token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || signPayload(encodedPayload) !== signature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (!payload?.adminId || !payload?.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

function verifyAdminSession(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const payload = verifyAdminSessionToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, error: "Unauthorized admin access" });
  }

  req.admin = payload;
  next();
}

module.exports = {
  createAdminSessionToken,
  verifyAdminSession,
};
