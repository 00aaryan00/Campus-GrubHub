const express = require("express");
const verifyCafeToken = require("../middlewares/cafeAuth");
const {
  adminLogin,
  getAdminDashboard,
  updateAdminDashboard,
  deleteAdminDish,
} = require("../controllers/cafeAdminController");
const {
  getCafeMenu,
  voteOnCafeDish,
  submitCafeFeedback,
  getCafeDishVotes,
  getCafeUserVotes,
} = require("../controllers/cafeController");

const router = express.Router();

router.post("/admin-login", adminLogin);
router.get("/admin-dashboard", getAdminDashboard);
router.post("/admin-dashboard", updateAdminDashboard);
router.delete("/admin-dashboard", deleteAdminDish);

router.get("/menu", getCafeMenu);
router.post("/vote", verifyCafeToken, voteOnCafeDish);
router.post("/feedback", verifyCafeToken, submitCafeFeedback);
router.get("/dish-votes", getCafeDishVotes);
router.get("/user-votes/:userId", verifyCafeToken, getCafeUserVotes);

module.exports = router;
