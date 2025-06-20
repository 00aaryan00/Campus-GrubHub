const admin = require("firebase-admin");

try {
  // Construct serviceAccount from individual environment variables
  const serviceAccount = {
    type: process.env.FIREBASE_ADMIN_TYPE,
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix newline characters
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
    token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  // Validate required fields
  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Missing required Firebase Admin configuration - check environment variables');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com` // Added storage bucket
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket(); // Initialize storage if needed
  
  console.log("✅ Firebase Admin initialized successfully");
  module.exports = { admin, db, bucket }; // Now exports bucket too
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error.message);
  if (error.message.includes('private_key')) {
    console.error('Private key format issue - ensure newlines are properly escaped with \\n');
  }
  process.exit(1);
}