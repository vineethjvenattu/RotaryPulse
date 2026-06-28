import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "rotary-club-of-amity-tvm"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, "chapters", "amity", "members"), limit(2));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}
check();
