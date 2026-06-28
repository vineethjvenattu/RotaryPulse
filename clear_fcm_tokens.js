import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, deleteField, doc } from "firebase/firestore";
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
    let updatedCount = 0;
    
    for (const d of snap.docs) {
      const data = d.data();
      if (data.fcmToken) {
        await updateDoc(doc(db, "users", d.id), {
          fcmToken: deleteField()
        });
        updatedCount++;
      }
    }
    
    console.log(`Successfully cleared fcmToken from ${updatedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
