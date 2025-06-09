// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1R_T84WRy8iuvw371Hm_8yCBZP72rvwk",
  authDomain: "campus-grubhub.firebaseapp.com",
  projectId: "campus-grubhub",
  storageBucket: "campus-grubhub.appspot.com",
  messagingSenderId: "334403300665",
  appId: "1:334403300665:web:2e988e00e9c6d6f69a0ce8",
  measurementId: "G-MG04HH8G82",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth, provider, and firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);