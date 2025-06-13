// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzGCo69CAjAQh6C6JfEO79JaQ6vi1vTPk",
  authDomain: "campus-grubhub-9e02c.firebaseapp.com",
  projectId: "campus-grubhub-9e02c",
  storageBucket: "campus-grubhub-9e02c.firebasestorage.app",
  messagingSenderId: "986274538780",
  appId: "1:986274538780:web:3e5ee3ceb9aaccfe1586d9",
  measurementId: "G-RNZDWXCJ61"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth, provider, and firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);