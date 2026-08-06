/**
 * SnapSME Central Firebase SDK Initialization (Robust Web ES Modules)
 * Environment Variable Driven Configuration
 */
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Helper to safely fetch environment variables in Vite & browser environments
const getEnv = (key, fallback = "") => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof window !== "undefined" && window.__SNAPSME_ENV__ && window.__SNAPSME_ENV__[key]) {
    return window.__SNAPSME_ENV__[key];
  }
  return fallback;
};

export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyAmQZ0c6cvJhJLBgpNIbcZcNM33yi5ZgtY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "snapsme-d26f6.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "snapsme-d26f6"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "snapsme-d26f6.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "588031509042"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:588031509042:web:dd11f5a6e29a341156722b"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-ZY2K7H6ZN4")
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with modern persistent cache (synchronous setup — no async race condition).
// persistentLocalCache + persistentMultipleTabManager replaces the deprecated
// enableMultiTabIndexedDbPersistence() which blocked early Firestore reads during login.
let db;
try {
  db = initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.info("[snapsme] Firestore multi-tab persistent cache initialized.");
} catch (e) {
  // Already initialized (e.g. HMR in dev mode) — reuse the existing instance.
  db = getFirestore(app);
  console.info("[snapsme] Firestore reusing existing instance.");
}
export { db };

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
