import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`There are ${usersSnap.size} global users.`);
  if (usersSnap.size > 0) {
    console.log("First 10 users:");
    console.dir(usersSnap.docs.slice(0, 10).map(d => ({id: d.id, ...d.data()})));
  }
  process.exit(0);
}
checkUsers();
