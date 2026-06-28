import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "dummy",
  projectId: "rotary-club-of-amity-tvm"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const code = "999999";
  // Simulate create
  await setDoc(doc(db, "devCodes", code), {
    code,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  // Simulate validate
  const docSnap = await getDoc(doc(db, "devCodes", code));
  if (!docSnap.exists()) { console.log("Code not found"); return; }
  const data = docSnap.data();
  if (new Date(data.expiresAt) < new Date()) { console.log("Expired"); return; }
  
  // Simulate getAllUsersForDev
  const snap = await getDocs(collection(db, "users"));
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Found users for dropdown:", users.length);
}
test().catch(console.error);
