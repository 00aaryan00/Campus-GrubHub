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

function createCorsMiddleware() {
  const allowedOrigins = buildAllowedOrigins();

  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });
}

module.exports = createCorsMiddleware;
