const express = require("express");
const { heavyLimiter } = require("../config/rateLimit");
const verifyMessToken = require("../middlewares/messAuth");
const { saveUser, getUserProfile } = require("../controllers/userController");
const {
  getMenu,
  voteOnDish,
  getUserVotes,
  getLeaderboard,
  initializeMessData,
} = require("../controllers/messController");

const router = express.Router();

router.post("/save-user", heavyLimiter, verifyMessToken, saveUser);
router.get("/menu", heavyLimiter, getMenu);
router.post("/vote", verifyMessToken, voteOnDish);
router.get("/user-votes", verifyMessToken, getUserVotes);
router.get("/leaderboard", getLeaderboard);
router.get("/user-profile", verifyMessToken, getUserProfile);
router.get("/admin/init-data", heavyLimiter, initializeMessData);

module.exports = router;
