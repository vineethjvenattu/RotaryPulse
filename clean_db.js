import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyBpVt_4q2gp-0Ak06yP7ycez2O-f6_pnDs",
  authDomain: "rotary-club-of-amity-tvm.firebaseapp.com",
  projectId: "rotary-club-of-amity-tvm",
  storageBucket: "rotary-club-of-amity-tvm.firebasestorage.app",
  messagingSenderId: "962876194129",
  appId: "1:962876194129:web:c06ce844d38654bfdf2770"
});

const db = getFirestore(app);

async function clean() {
  console.log("WIPING ALL USERS...");
  const usersSnap = await getDocs(collection(db, 'users'));
  let deletedUsers = 0;
  
  for (const d of usersSnap.docs) {
    await deleteDoc(d.ref);
    deletedUsers++;
  }
  
  console.log("WIPING ALL CHAPTER MEMBERS...");
  const chaptersSnap = await getDocs(collection(db, 'chapters'));
  let deletedChapterMembers = 0;

  for (const chap of chaptersSnap.docs) {
    const membersSnap = await getDocs(collection(db, `chapters/${chap.id}/members`));
    for (const m of membersSnap.docs) {
      await deleteDoc(m.ref);
      deletedChapterMembers++;
    }
  }

  console.log(`Done! DELETED ${deletedUsers} users and ${deletedChapterMembers} chapter members. DB is empty.`);
  process.exit(0);
}

clean().catch(console.error);
