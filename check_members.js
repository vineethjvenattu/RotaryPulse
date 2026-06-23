import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const chaptersSnap = await getDocs(collection(db, "chapters"));
  for (const chapter of chaptersSnap.docs) {
    const memSnap = await getDocs(collection(db, "chapters", chapter.id, "members"));
    console.log(`Chapter ${chapter.id} has ${memSnap.size} members.`);
    if (memSnap.size > 0) {
      console.log("First 3 members:");
      console.dir(memSnap.docs.slice(0, 3).map(d => ({id: d.id, ...d.data()})));
    }
  }
  process.exit(0);
}
check();
