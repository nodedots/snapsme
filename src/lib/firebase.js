/**
 * SnapSME Central Firebase SDK Initialization (Robust Web ES Modules)
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAmQZ0c6cvJhJLBgpNIbcZcNM33yi5ZgtY",
  authDomain: "snapsme-d26f6.firebaseapp.com",
  projectId: "snapsme-d26f6",
  storageBucket: "snapsme-d26f6.firebasestorage.app",
  messagingSenderId: "588031509042",
  appId: "1:588031509042:web:dd11f5a6e29a341156722b",
  measurementId: "G-ZY2K7H6ZN4"
};

// Initialize Firebase App & Services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
