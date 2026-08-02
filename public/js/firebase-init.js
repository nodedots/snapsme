/**
 * SnapSME Static Page Firebase CDN Initializer
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmQZ0c6cvJhJLBgpNIbcZcNM33yi5ZgtY",
  authDomain: "snapsme-d26f6.firebaseapp.com",
  projectId: "snapsme-d26f6",
  storageBucket: "snapsme-d26f6.firebasestorage.app",
  messagingSenderId: "588031509042",
  appId: "1:588031509042:web:dd11f5a6e29a341156722b",
  measurementId: "G-ZY2K7H6ZN4"
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
