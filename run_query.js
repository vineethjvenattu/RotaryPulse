import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const snap = await getDocs(collection(db, "users"));
    let rolesCount = 0;
    let familyCount = 0;
    let total = snap.size;
    
    snap.forEach(doc => {
      const data = doc.data();
      if (data.Role && data.Role !== "Member") rolesCount++;
      if (data.FamilyMembers && data.FamilyMembers.length > 0) familyCount++;
    });
    
    console.log(`Total users: ${total}`);
    console.log(`Users with custom roles: ${rolesCount}`);
    console.log(`Users with family members: ${familyCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
