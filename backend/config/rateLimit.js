const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

function skipRateLimit(req) {
  if (isProduction) return false;

  const hostname = req.hostname || req.get("host") || "";
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("localhost") ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip?.includes("127.0.0.1") ||
    ip?.includes("::1")
  );
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

const heavyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 30 : 10000,
  message: "Rate limit exceeded for this endpoint.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: isProduction ? undefined : () => true,
});

function applyGlobalRateLimit(app) {
  if (isProduction) {
    app.use(limiter);
    return;
  }

  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 10000,
      skip: () => true,
    })
  );
}

function logRateLimitStatus() {
  console.log("Rate Limiter Status:");
  console.log(`   Environment: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);

  if (isProduction) {
    console.log("   Global Limiter: 100 req/15min");
    console.log("   Heavy Limiter: 30 req/min");
  } else {
    console.log("   Global Limiter: DISABLED (development mode)");
    console.log("   Heavy Limiter: DISABLED (development mode)");
    console.log("   Rate limiting is OFF for local development");
  }
}

module.exports = {
  isProduction,
  heavyLimiter,
  applyGlobalRateLimit,
  logRateLimitStatus,
};
