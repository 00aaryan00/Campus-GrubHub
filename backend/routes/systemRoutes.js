const express = require("express");
const { getRoot, getHealth, getDailyQuote } = require("../controllers/systemController");

const router = express.Router();

router.get("/", getRoot);
router.get("/health", getHealth);
router.get("/daily-quote", getDailyQuote);

module.exports = router;
