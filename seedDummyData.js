import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

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
  if (membersSnap.empty) {
    console.log("No members found");
    return;
  }
  
  // Pick the first two members
  const member1 = membersSnap.docs[0];
  const member2 = membersSnap.docs[1];

  console.log(`Seeding data for ${member1.data().Name} (${member1.id}) and ${member2.data().Name} (${member2.id})`);

  // Give Member 1 $1500 in donations (Meets first OR group)
  await addDoc(collection(db, "chapters", chapterId, "payments"), {
    "Member ID": member1.id,
    "Member Name": member1.data().Name,
    "Status": "Paid",
    "Category": "Donation",
    "Amount": 1500,
    "Created At": new Date().toISOString()
  });

  // Give Member 2 $600 in donations + 2 events attended
  await addDoc(collection(db, "chapters", chapterId, "payments"), {
    "Member ID": member2.id,
    "Member Name": member2.data().Name,
    "Status": "Paid",
    "Category": "Donation",
    "Amount": 600,
    "Created At": new Date().toISOString()
  });

  // Let's create two events and attendance records
  const e1 = await addDoc(collection(db, "chapters", chapterId, "events"), { title: "Test Event 1", date: new Date().toISOString() });
  const e2 = await addDoc(collection(db, "chapters", chapterId, "events"), { title: "Test Event 2", date: new Date().toISOString() });

  await addDoc(collection(db, "chapters", chapterId, "attendance"), {
    "Event ID": e1.id,
    "Member ID": member2.id,
    "Status": "Present",
    "Date": new Date().toISOString()
  });
  
  await addDoc(collection(db, "chapters", chapterId, "attendance"), {
    "Event ID": e2.id,
    "Member ID": member2.id,
    "Status": "Present",
    "Date": new Date().toISOString()
  });

  console.log("Seed complete.");
  process.exit(0);
}

run().catch(console.error);
