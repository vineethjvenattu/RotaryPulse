import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "dummy",
  authDomain: "rotary-club-of-amity-tvm.firebaseapp.com",
  projectId: "rotary-club-of-amity-tvm",
  storageBucket: "rotary-club-of-amity-tvm.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:123"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const membersSnap = await getDocs(collection(db, "chapters", "amity-tvm", "members"));
  let deepa = null;
  membersSnap.forEach(doc => {
    if (doc.data()["Name"] === "Deepa K K" || doc.data().Name === "Deepa K K" || String(doc.data().Name).includes("Deepa")) {
      deepa = { id: doc.id, ...doc.data() };
    }
  });
  console.log("Deepa:", deepa ? deepa["Member ID"] : "Not Found");
  
  if (deepa) {
    const pSnap = await getDocs(collection(db, "chapters", "amity-tvm", "payments"));
    pSnap.forEach(doc => {
      const p = doc.data();
      if (String(p["Member ID"]) === String(deepa["Member ID"])) {
        console.log("Payment:", p["Payment ID"], p["Status"], p["Category"], p["Description"]);
      }
    });
  }
}
check().then(() => process.exit(0)).catch(console.error);
