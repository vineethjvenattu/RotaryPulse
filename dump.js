import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyBpVt_4q2gp-0Ak06yP7ycez2O-f6_pnDs",
  authDomain: "rotary-club-of-amity-tvm.firebaseapp.com",
  projectId: "rotary-club-of-amity-tvm",
  storageBucket: "rotary-club-of-amity-tvm.firebasestorage.app",
  messagingSenderId: "962876194129",
  appId: "1:962876194129:web:c06ce844d38654bfdf2770"
});

const db = getFirestore(app);

async function dump() {
  const snapshot = await getDocs(collection(db, 'chapters'));
  for (const d of snapshot.docs) {
    const data = d.data();
    console.log(`Chapter: ${d.id}`);
    if (data.members) {
      console.log(`  Members: ${data.members.length}`);
      data.members.forEach(m => console.log(`   - ID: ${m["Member ID"]}, Name: ${m.Name}, Email: ${m.Email}`));
    } else {
      console.log(`  No members array`);
    }
  }
  process.exit(0);
}

dump().catch(console.error);
