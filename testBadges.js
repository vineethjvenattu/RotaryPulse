import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpVt_4q2gp-0Ak06yP7ycez2O-f6_pnDs",
  authDomain: "rotary-club-of-amity-tvm.firebaseapp.com",
  projectId: "rotary-club-of-amity-tvm",
  storageBucket: "rotary-club-of-amity-tvm.firebasestorage.app",
  messagingSenderId: "962876194129",
  appId: "1:962876194129:web:c06ce844d38654bfdf2770"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const chapterId = "amity-tvm";
  const membersSnap = await getDocs(collection(db, "chapters", chapterId, "members"));
  const members = membersSnap.docs.map(d => ({id: d.id, ...d.data()}));

  const eligibleNames = ['Abhi Krishna Suresh', 'Sheena V Raj', 'Vineeth J Pillai'];
  members.forEach(m => {
    if (eligibleNames.includes(m.Name)) {
      console.log(m.Name, m.badges ? m.badges.map(b => b.id) : 'No badges');
    }
  });
  
  process.exit(0);
}
run();
