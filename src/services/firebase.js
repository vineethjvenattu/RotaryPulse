import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if we have a valid configuration before initializing
const hasConfig = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

let app = null;
let db = null;
let storage = null;
let messaging = null;
let functions = null;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Initialize Messaging if supported in the browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      messaging = getMessaging(app);
    }
    
    functions = getFunctions(app);
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

export { app, db, storage, messaging, functions, hasConfig };
