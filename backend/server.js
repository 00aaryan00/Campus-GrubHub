const createApp = require("./app");
const { initializeMenu, initializeDishVotes } = require("./services/menuInitializationService");

const app = createApp();
const PORT = process.env.PORT || 5000;

let initialized = false;
if (!initialized) {
  initializeMenu();
  initializeDishVotes();
  initialized = true;
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
