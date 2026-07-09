import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { evaluateCriteria } from "./src/utils/badges.js";

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
  const paymentsSnap = await getDocs(collection(db, "chapters", chapterId, "payments"));
  const attendanceSnap = await getDocs(collection(db, "chapters", chapterId, "attendance"));
  
  const payments = paymentsSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const attendance = attendanceSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const members = membersSnap.docs.map(d => ({id: d.id, ...d.data()}));

  const criteria = {
    metric: 'donations_amount',
    operator: '>=',
    value: '1000',
    ruleGroups: [
      { conditions: [ { metric: 'donations_amount', operator: '>=', value: '1000' } ] },
      { conditions: [ { metric: 'events_attended', operator: '>=', value: '250' }, { metric: 'attendance_rate', operator: '>=', value: '100' } ] }
    ]
  };

  const eligible = [];
  members.forEach(member => {
    const meets = evaluateCriteria(member["Member ID"] || member.id, criteria, payments, attendance);
    if (meets) eligible.push(member.Name);
  });
  
  console.log("Eligible:", eligible);
  process.exit(0);
}
run();
