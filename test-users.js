import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "dummy",
  projectId: "rotary-club-of-amity-tvm"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const snap = await getDocs(collection(db, "users"));
  console.log("Users count:", snap.size);
  if(snap.size > 0) {
      console.log("First user:", snap.docs[0].data());
  }
}
test().catch(console.error);
