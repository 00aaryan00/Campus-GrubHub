const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let messMenu = {
  breakfast: "Aloo Paratha",
  lunch: "Rajma Chawal",
  dinner: "Paneer Butter Masala"
};

let votes = {
  breakfast: { like: 0, dislike: 0 },
  lunch: { like: 0, dislike: 0 },
  dinner: { like: 0, dislike: 0 }
};

const quotes = [
  "Let food be thy medicine and medicine be thy food.",
  "You don’t need a silver fork to eat good food.",
  "Food is symbolic of love when words are inadequate.",
  "One cannot think well, love well, sleep well, if one has not dined well.",
  "Good food equals good mood!"
];

app.get("/menu", (req, res) => {
  res.json({ menu: messMenu, votes });
});

app.post("/vote", (req, res) => {
  const { meal, type } = req.body;
  if (votes[meal] && votes[meal][type] !== undefined) {
    votes[meal][type]++;
    res.json({ success: true, updated: votes[meal] });
  } else {
    res.status(400).json({ success: false, message: "Invalid meal or type" });
  }
});

app.get("/daily-quote", (req, res) => {
  const dayIndex = new Date().getDate() % quotes.length;
  res.json({ quote: quotes[dayIndex] });
});

app.get("/leaderboard", (req, res) => {
  const leaderboard = Object.entries(votes)
    .map(([meal, data]) => ({
      _id: meal,
      count: data.like
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  res.json(leaderboard);
});

app.listen(5000, () => {
  console.log("✅ Backend running on http://localhost:5000");
});
