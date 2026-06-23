import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listNames() {
  const membersSnap = await getDocs(collection(db, "chapters", "amity-tvm", "members"));
  membersSnap.docs.forEach(d => console.log(d.data().Name, d.data().Email));
  process.exit(0);
}
listNames();
