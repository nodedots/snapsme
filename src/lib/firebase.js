/**
 * SnapSME Central Firebase SDK Initialization (Robust Web ES Modules)
 * Environment Variable Driven Configuration
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

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

import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Initialize Firebase App & Services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable Firestore offline persistence (Phase 4 — Offline-First Capture)
// Uses multi-tab persistence when available so multiple tabs share the cache.
if (typeof window !== "undefined") {
  try {
    enableMultiTabIndexedDbPersistence(db)
      .then(() => {
        console.info("[snapsme] Firestore multi-tab offline persistence enabled.");
      })
      .catch((err) => {
        if (err.code === "failed-precondition") {
          // Multi-tab not available (e.g. another tab already enabled it) — fall back to single-tab.
          enableIndexedDbPersistence(db)
            .then(() => {
              console.info("[snapsme] Firestore single-tab offline persistence enabled.");
            })
            .catch((persistErr) => {
              if (persistErr.code !== "already-exists") {
                console.warn("[snapsme] Firestore offline persistence unavailable:", persistErr.message);
              }
            });
        } else if (err.code !== "already-exists") {
          console.warn("[snapsme] Firestore offline persistence unavailable:", err.message);
        }
      });
  } catch (e) {
    console.warn("[snapsme] Firestore offline persistence setup failed:", e.message);
  }
}

export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
