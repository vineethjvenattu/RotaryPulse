import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clean() {
  console.log("Cleaning demo users...");
  const chaptersSnap = await getDocs(collection(db, "chapters"));
  let deletedCount = 0;
  for (const chapter of chaptersSnap.docs) {
    const memSnap = await getDocs(collection(db, "chapters", chapter.id, "members"));
    for (const memDoc of memSnap.docs) {
      const data = memDoc.data();
      // If Name is missing or includes Unknown, or Email is missing
      if (!data.Name || data.Name === 'Unknown' || data.Name.includes('Unknown') || !data.Email || data.Email.includes('Unknown')) {
        await deleteDoc(memDoc.ref);
        deletedCount++;
        console.log(`Deleted ${memDoc.id} from ${chapter.id}`);
      }
    }
  }
  console.log(`Deleted ${deletedCount} users.`);
  process.exit(0);
}
clean();
