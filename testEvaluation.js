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
const chapterId = "amity-tvm";

async function run() {
  const membersSnap = await getDocs(collection(db, "chapters", chapterId, "members"));
  const paymentsSnap = await getDocs(collection(db, "chapters", chapterId, "payments"));
  const attendanceSnap = await getDocs(collection(db, "chapters", chapterId, "attendance"));
  
  const payments = paymentsSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const attendance = attendanceSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const members = membersSnap.docs.map(d => ({id: d.id, ...d.data()}));

  console.log(`Total Members: ${members.length}, Payments: ${payments.length}, Attendance: ${attendance.length}`);
  
  const memberId = members[0].id;
  const memberIdStr = String(members[0]["Member ID"] || members[0].id);
  console.log(`Checking member: ${members[0].Name} (${memberIdStr})`);
  
  let totalDonations = 0;
  for (let p of payments) {
    if (String(p["Member ID"]) === memberIdStr && p["Status"] === 'Paid') {
      const cat = (p["Category"] || '').toLowerCase();
      const desc = (p["Description"] || '').toLowerCase();
      if (cat.includes('donation') || cat.includes('charity') || desc.includes('donation') || desc.includes('charity')) {
        totalDonations += parseFloat(p["Amount"] || 0);
      }
    }
  }
  console.log(`Total Donations: ${totalDonations}`);
  
  process.exit(0);
}
run();
