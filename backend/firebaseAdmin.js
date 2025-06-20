require('dotenv').config(); // MUST be at the very top
const admin = require("firebase-admin");

// Debugging
console.log('Environment variables loaded:', Object.keys(process.env).filter(k => k.startsWith('FIREBASE')));
console.log('Private key exists:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
console.log('Private key starts with:', process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30));
console.log('Private key starts with:', process.env.FIREBASE_ADMIN_PRIVATE_KEY.substring(0, 50));
console.log('Private key length:', process.env.FIREBASE_ADMIN_PRIVATE_KEY.length);
try {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is missing');
  }

  // Process the key (handle both quoted and unquoted cases)
  const processedKey = privateKey
    .replace(/^"+|"+$/g, '') // Remove surrounding quotes if present
    .replace(/\\n/g, '\n');   // Convert escaped newlines to real newlines

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
    universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  }

  console.log("✅ Firebase Admin initialized successfully");
  module.exports = {
    admin,
    db: admin.firestore(),
    bucket: admin.storage().bucket()
  };

} catch (error) {
  console.error("❌ FATAL ERROR initializing Firebase Admin:");
  console.error(error.message);
  console.error("\nAdditional debugging info:");
  console.error("Private key length:", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length);
  console.error("First 50 chars:", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 50));
  console.error("Last 50 chars:", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.slice(-50));
  process.exit(1);
}