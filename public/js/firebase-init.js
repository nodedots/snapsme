/**
 * SnapSME Static Page Firebase CDN Initializer
 * Fetches Firebase config from server endpoint to keep API keys out of client source.
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

let app = null;
let db = null;
let initPromise = null;

/**
 * Fetches Firebase config from the server and initializes Firebase.
 * Must be called before using window.firebaseApp or window.firestoreDb.
 */
export async function initFirebase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Try server endpoint first (keeps API key out of client source)
    let config = null;
    try {
      const res = await fetch("/api/firebase-config");
      if (res.ok) {
        config = await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch Firebase config from server, falling back to env:", e.message);
    }

    // Fallback to env vars injected via window.__SNAPSME_ENV__
    if (!config || !config.apiKey) {
      config = {
        apiKey: getEnv("VITE_FIREBASE_API_KEY"),
        authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
        projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
        storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
        appId: getEnv("VITE_FIREBASE_APP_ID"),
        measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID")
      };
    }

    if (!config.apiKey) {
      throw new Error("Firebase API key is not configured. Please set VITE_FIREBASE_API_KEY in your environment.");
    }

    app = initializeApp(config);
    db = getFirestore(app);

    // Expose on window for backward compatibility
    window.firebaseApp = app;
    window.firestoreDb = db;
    window.firestoreHelpers = { collection, doc, setDoc };

    try {
      window.firebaseAnalytics = getAnalytics(app);
    } catch (e) {
      // Analytics optional fallback
    }

    return { app, db };
  })();

  return initPromise;
}

// Auto-initialize on module load for static pages
if (typeof window !== "undefined") {
  initFirebase().catch((err) => {
    console.error("Firebase initialization failed:", err.message);
  });
}
