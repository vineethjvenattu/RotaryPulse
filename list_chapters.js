import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listChapters() {
  const snap = await getDocs(collection(db, "chapters"));
  snap.docs.forEach(d => console.log(d.id, d.data().name));
  process.exit(0);
}
listChapters();
