const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const admin = require("firebase-admin");

const firebaseEnvKeys = Object.keys(process.env).filter((key) => key.startsWith("FIREBASE_"));

console.log("Firebase env keys present:", firebaseEnvKeys);
console.log("FIREBASE_ADMIN_PRIVATE_KEY exists:", !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
console.log(
  "FIREBASE_ADMIN_PRIVATE_KEY length:",
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.length : 0
);

try {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is missing");
  }

  const processedKey = privateKey.replace(/^"+|"+$/g, "").replace(/\\n/g, "\n");

  const serviceAccount = {
    type: process.env.FIREBASE_ADMIN_TYPE,
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: processedKey,
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
    token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || "googleapis.com",
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });
  }

  console.log("Firebase Admin initialized successfully");
  module.exports = {
    admin,
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
  };
} catch (error) {
  console.error("FATAL ERROR initializing Firebase Admin:");
  console.error(error.message);
  console.error("\nAdditional debugging info:");
  console.error("Firebase env keys present:", firebaseEnvKeys);
  console.error(
    "FIREBASE_ADMIN_PRIVATE_KEY length:",
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.length : 0
  );
  process.exit(1);
}
