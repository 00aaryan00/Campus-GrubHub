// firebaseAdmin.js
const admin = require("firebase-admin");

try {
  const serviceAccount = require("./serviceAccount.json");
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
  }

  const db = admin.firestore();
  console.log("✅ Firebase Admin initialized successfully");
  module.exports = { admin, db };
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error);
  process.exit(1);
}
