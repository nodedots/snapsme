/**
 * SnapSME Static Page Firebase CDN Initializer
 * Environment Variable Driven Configuration
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const getEnv = (key, fallback = "") => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof window !== "undefined" && window.__SNAPSME_ENV__ && window.__SNAPSME_ENV__[key]) {
    return window.__SNAPSME_ENV__[key];
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyAmQZ0c6cvJhJLBgpNIbcZcNM33yi5ZgtY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "snapsme-d26f6.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "snapsme-d26f6"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "snapsme-d26f6.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "588031509042"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:588031509042:web:dd11f5a6e29a341156722b"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-ZY2K7H6ZN4")
};

// Initialize App & Firestore globally on window
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firebaseApp = app;
window.firestoreDb = db;
window.firestoreHelpers = { collection, doc, setDoc };

try {
  window.firebaseAnalytics = getAnalytics(app);
} catch (e) {
  // Analytics optional fallback
}
