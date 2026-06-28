import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

// Parse firebase config from src/services/api.js or just assume the usual
const app = initializeApp(JSON.parse(fs.readFileSync('firebase-config.json')));
const db = getFirestore(app);

const snap = await getDocs(collection(db, "global_notifications"));
console.log("Documents:", snap.docs.length);
snap.docs.forEach(d => console.log(d.id, d.data()));
