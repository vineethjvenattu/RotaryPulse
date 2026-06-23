import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  const membersSnap = await getDocs(collection(db, "chapters", "amity-tvm", "members"));

  const userIds = usersSnap.docs.map(d => d.id);
  const memIds = membersSnap.docs.map(d => d.id);

  console.log("Global Users:", userIds.length);
  console.log("Chapter Members:", memIds.length);

  const onlyGlobal = userIds.filter(id => !memIds.includes(id));
  const onlyChapter = memIds.filter(id => !userIds.includes(id));

  console.log("In Global but not Chapter:", onlyGlobal);
  console.log("In Chapter but not Global:", onlyChapter);

  process.exit(0);
}
listUsers();
