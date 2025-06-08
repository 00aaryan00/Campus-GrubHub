const express = require("express");
const cors = require("cors");

const app = express();
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/messVotes", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once("open", () => {
  console.log("✅ Connected to MongoDB");
});

app.use(cors());
app.use(express.json());

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weekly Mess Menu (from image)
let messMenu = {
  Monday: {
    breakfast: ["Aloo Paratha", "Butter", "Onion Flakes", "Chana Sprouts"],
    lunch: ["Aloo Cabbage", "Rajma", "Rice", "Dal Fry", "Butter Milk"],
    snacks: ["Chowmein Samosa", "Tea/Coffee"],
    dinner: ["Palak Corn", "Roti", "Rice", "Motichoor Laddu/Boondi"]
  },
  Tuesday: {
    breakfast: ["Moong Chilla", "Chutney", "Daliya", "Moong Sprouts", "Guava/Banana"],
    lunch: ["Aloo Matar", "Gravy Chana Masala", "Jeera Rice", "Achar", "Salad"],
    snacks: ["Vada Pav", "Pickle", "Chilli + Red & Green Chutney", "Tea/Coffee"],
    dinner: ["Chhola", "Puri", "Aloo Beans", "Rice", "Roti", "Lung Laddu"]
  },
  Wednesday: {
    breakfast: ["Mix Paratha", "Butter", "Chutney", "Corn Flakes", "Moong Sprouts"],
    lunch: ["Lauki Aloo", "Dry Soya Chunks", "Panchratan Dal", "Boondi Raita", "Chips"],
    snacks: ["Pasta", "Tea/Coffee"],
    dinner: ["Veg Paneer Kali Mirch Matar", "Jeera Rice", "Roti", "Arhar Dal", "Achar"]
  },
  Thursday: {
    breakfast: ["Uttapam", "Idli", "Sambhar", "Coconut Chutney", "Banana", "Chana Salted"],
    lunch: ["Kathol", "Methi Phulki", "Tomato Salad", "Rice", "Papad", "Dal Makhani", "Paratha"],
    snacks: ["Aloo Corn Sandwich", "Tea/Coffee"],
    dinner: ["Veg Kofta", "Paneer Bhurji", "Rice", "Roti", "Gulab Jamun"]
  },
  Friday: {
    breakfast: ["Paneer Paratha", "Butter", "Corn Flakes", "Chana"],
    lunch: ["Matar Mushroom Dry", "Kadi Pakoda", "Masoor Dal Fry", "Papad"],
    snacks: ["Poha", "Tea/Coffee"],
    dinner: ["Veg Kadai Paneer", "Dal Fry", "Roti", "Rice", "Pickle"]
  },
  Saturday: {
    breakfast: ["Methi Puri", "Bhaji", "Aloo", "Namkeen", "Banana", "Chana Sprouts"],
    lunch: ["Aloo Ko Chokha Seasonal Veg", "Papad", "Kadhi", "Curd", "Rice", "French Fries"],
    snacks: ["Pav Bhaji", "Tea/Coffee"],
    dinner: ["Matar Paneer", "Roti", "Rice", "Boondi Raita", "Moong Dal"]
  },
  Sunday: {
    breakfast: ["Masala Dosa", "Chutney", "Sambar", "Cornflakes", "Sprouts", "Bread", "Butter", "Jam"],
    lunch: ["Chole Bhature", "Jeera Aloo", "Dal", "Papad", "Dahi", "Achar"],
    snacks: ["Aloo Tikki", "Sauce", "Tea/Coffee"],
    dinner: ["Paneer Masala", "Dal Fry", "Rice", "Roti", "Lemon", "Onion", "Tomato"]
  }
};

const quotes = [
  "Let food be thy medicine and medicine be thy food.",
  "You don’t need a silver fork to eat good food.",
  "Food is symbolic of love when words are inadequate.",
  "One cannot think well, love well, sleep well, if one has not dined well.",
  "Good food equals good mood!"
];

// Mongoose schema for storing votes
const dishVoteSchema = new mongoose.Schema({
  item: { type: String, required: true, unique: true },
  like: { type: Number, default: 0 },
  dislike: { type: Number, default: 0 }
});
const DishVote = mongoose.model("DishVote", dishVoteSchema);

// Initialize all votes in DB
async function initializeVotes() {
  for (let dayMeals of Object.values(messMenu)) {
    for (let items of Object.values(dayMeals)) {
      for (let item of items) {
        await DishVote.updateOne(
          { item },
          { $setOnInsert: { like: 0, dislike: 0 } },
          { upsert: true }
        );
      }
    }
  }
}
initializeVotes();

// API to get today's menu with live vote counts
app.get("/menu", (req, res) => {
  const todayIndex = new Date().getDay();
  const today = days[todayIndex];
  const todayMenu = messMenu[today] || {};

  DishVote.find().then(allVotes => {
    const votesMap = {};
    allVotes.forEach(vote => {
      votesMap[vote.item] = { like: vote.like, dislike: vote.dislike };
    });
    res.json({ menu: todayMenu, votes: votesMap, day: today });
  });
});

// Vote API — like/dislike any item
app.post("/vote", (req, res) => {
  const { item, type } = req.body;

  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid vote type" });
  }

  DishVote.findOneAndUpdate(
    { item },
    { $inc: { [type]: 1 } },
    { new: true }
  ).then(updatedVote => {
    if (!updatedVote) {
      return res.status(400).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, updated: updatedVote });
  }).catch(err => {
    res.status(500).json({ success: false, message: "Server error", error: err });
  });
});

// Quote of the day
app.get("/daily-quote", (req, res) => {
  const index = new Date().getDate() % quotes.length;
  res.json({ quote: quotes[index] });
});

// Top 5 liked dishes leaderboard
app.get("/leaderboard", (req, res) => {
  DishVote.find()
    .sort({ like: -1 })
    .limit(5)
    .then(topVotes => {
      const leaderboard = topVotes.map(v => ({ _id: v.item, count: v.like }));
      res.json(leaderboard);
    })
    .catch(err => {
      res.status(500).json({ success: false, message: "Server error", error: err });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
