const cors = require("cors");

function buildAllowedOrigins() {
  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://campus-grub-hub.vercel.app",
    ...(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
}

function isAllowedVercelPreview(origin) {
  return /^https:\/\/campus-grub-hub(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

function createCorsMiddleware() {
  const allowedOrigins = buildAllowedOrigins();

  return cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed = allowedOrigins.includes(origin) || isAllowedVercelPreview(origin);
      callback(null, isAllowed);
    },
    credentials: true,
  });
}

module.exports = createCorsMiddleware;
