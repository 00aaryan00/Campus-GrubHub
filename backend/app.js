const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const createCorsMiddleware = require("./config/cors");
const { applyGlobalRateLimit, logRateLimitStatus } = require("./config/rateLimit");
const requestLogger = require("./middlewares/requestLogger");
const systemRoutes = require("./routes/systemRoutes");
const messRoutes = require("./routes/messRoutes");
const cafeRoutes = require("./routes/cafeRoutes");

function createApp() {
  const app = express();

  app.use(createCorsMiddleware());
  app.use(express.json());
  app.set("trust proxy", 1);

  applyGlobalRateLimit(app);
  logRateLimitStatus();

  app.use(requestLogger);
  app.use(systemRoutes);
  app.use(messRoutes);
  app.use("/auntys-cafe", cafeRoutes);

  return app;
}

module.exports = createApp;
