// Firestore Seed Script — populates the cloud database with initial data
// Run: node seed-firestore.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with default credentials (uses `firebase login` credentials via gcloud ADC)
initializeApp({ projectId: 'rotary-club-of-amity-tvm' });
const db = getFirestore();

const MEMBERS = [
  {"Member ID":"M001","Name":"Rtn. Arjun Mehta","Mobile":"9876543210","Email":"arjun.mehta@email.com","Role":"President","Classification":"Real Estate","Blood Group":"O+","Birthday":"7 June","Anniversary":"15 February","Join Date":"10 Jan 2023","Password/PIN":"1234","Image":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M002","Name":"Rtn. Mrs. Neha Sharma","Mobile":"9876543211","Email":"neha@email.com","Role":"Secretary","Classification":"Education","Blood Group":"A+","Birthday":"12 June","Anniversary":"20 June","Join Date":"12 Jan 2023","Password/PIN":"1111","Image":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M003","Name":"Rtn. Sanjay Patel","Mobile":"9876543212","Email":"sanjay@email.com","Role":"Treasurer","Classification":"Finance","Blood Group":"B+","Birthday":"22 August","Anniversary":"7 June","Join Date":"05 Feb 2023","Password/PIN":"2222","Image":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M004","Name":"Rtn. Mrs. Priya Shah","Mobile":"9876543213","Email":"priya@email.com","Role":"Member","Classification":"Healthcare","Blood Group":"O-","Birthday":"7 June","Anniversary":"28 June","Join Date":"20 Mar 2023","Password/PIN":"3333","Image":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M005","Name":"Rtn. Rahul Verma","Mobile":"9876543214","Email":"rahul@email.com","Role":"Member","Classification":"Technology","Blood Group":"AB+","Birthday":"15 June","Anniversary":"","Join Date":"01 Jun 2023","Password/PIN":"4444","Image":"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M006","Name":"Rtn. Mrs. Meera Iyer","Mobile":"9876543215","Email":"meera@email.com","Role":"Member","Classification":"Legal Services","Blood Group":"A-","Birthday":"18 June","Anniversary":"7 June","Join Date":"15 Aug 2023","Password/PIN":"5555","Image":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M007","Name":"Rtn. Vikram Sen","Mobile":"9876543216","Email":"vikram@email.com","Role":"Member","Classification":"Architecture","Blood Group":"O+","Birthday":"8 June","Anniversary":"10 June","Join Date":"15 Sep 2023","Password/PIN":"6666","Image":"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80"},
  {"Member ID":"M008","Name":"Rtn. Mrs. Ananya Roy","Mobile":"9876543217","Email":"ananya@email.com","Role":"Member","Classification":"Design Services","Blood Group":"B-","Birthday":"9 June","Anniversary":"14 June","Join Date":"01 Nov 2023","Password/PIN":"7777","Image":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"}
];

const EVENTS = [
  {"Event ID":"E001","Event Name":"Weekly Meeting","Date":"2026-06-12","Time":"7:00 PM","Venue":"Rotary Hall","Type":"Meeting","Description":"Weekly club meeting and project status reviews."},
  {"Event ID":"E002","Event Name":"School Resource Support Drive","Date":"2026-06-15","Time":"10:00 AM","Venue":"Government Model School, Trivandrum","Type":"Service","Description":"Providing educational kits, school supplies, and supporting library resource setup."},
  {"Event ID":"E003","Event Name":"Glaucoma Awareness Cyclothon","Date":"2026-06-22","Time":"6:30 AM","Venue":"Kowdiar Square, Trivandrum","Type":"Service","Description":"Cyclothon to raise public awareness about glaucoma and offer free screening support."},
  {"Event ID":"E004","Event Name":"Sapling Plantation Drive","Date":"2026-06-28","Time":"8:00 AM","Venue":"Museum Grounds, Trivandrum","Type":"Service","Description":"Planting native tree saplings across Trivandrum to improve green cover."},
  {"Event ID":"E005","Event Name":"Rotary Chapter Meeting","Date":"2026-06-13","Time":"7:00 PM","Venue":"Rotary Hall","Type":"Meeting","Description":"Regular bi-weekly chapter meeting."},
  {"Event ID":"E006","Event Name":"Rotary Chapter Meeting","Date":"2026-06-27","Time":"7:00 PM","Venue":"Rotary Hall","Type":"Meeting","Description":"Regular bi-weekly chapter meeting."},
  {"Event ID":"E007","Event Name":"Rotary Chapter Meeting","Date":"2026-07-11","Time":"7:00 PM","Venue":"Rotary Hall","Type":"Meeting","Description":"Regular bi-weekly chapter meeting."},
  {"Event ID":"E008","Event Name":"Rotary Chapter Meeting","Date":"2026-07-25","Time":"7:00 PM","Venue":"Rotary Hall","Type":"Meeting","Description":"Regular bi-weekly chapter meeting."}
];

const ATTENDANCE = [
  {"Attendance ID":"AD001","Event ID":"E001","Event Name":"Weekly Meeting","Member ID":"M001","Member Name":"Rtn. Arjun Mehta","Status":"Present","Date":"2026-06-12"},
  {"Attendance ID":"AD002","Event ID":"E001","Event Name":"Weekly Meeting","Member ID":"M002","Member Name":"Rtn. Mrs. Neha Sharma","Status":"Present","Date":"2026-06-12"},
  {"Attendance ID":"AD003","Event ID":"E001","Event Name":"Weekly Meeting","Member ID":"M003","Member Name":"Rtn. Sanjay Patel","Status":"Present","Date":"2026-06-12"},
  {"Attendance ID":"AD004","Event ID":"E001","Event Name":"Weekly Meeting","Member ID":"M004","Member Name":"Rtn. Mrs. Priya Shah","Status":"Present","Date":"2026-06-12"},
  {"Attendance ID":"AD005","Event ID":"E001","Event Name":"Weekly Meeting","Member ID":"M005","Member Name":"Rtn. Rahul Verma","Status":"Absent","Date":"2026-06-12"}
];

const PAYMENTS = [
  {"Payment ID":"P001","Event ID":"","Member ID":"M001","Member Name":"Rtn. Arjun Mehta","Amount":1500,"Description":"Membership Fee 2026","Category":"Membership Fee","Quantity":0,"Status":"Pending","Due Date":"2026-06-30","Paid Date":"","Reference":"","Notes":""},
  {"Payment ID":"P002","Event ID":"","Member ID":"M002","Member Name":"Rtn. Mrs. Neha Sharma","Amount":1500,"Description":"Membership Fee 2026","Category":"Membership Fee","Quantity":0,"Status":"Paid","Due Date":"2026-06-30","Paid Date":"2026-06-01","Reference":"TXN9876543","Notes":"Paid online"},
  {"Payment ID":"P003","Event ID":"","Member ID":"M004","Member Name":"Rtn. Mrs. Priya Shah","Amount":1500,"Description":"Membership Fee 2026","Category":"Membership Fee","Quantity":0,"Status":"Pending","Due Date":"2026-06-30","Paid Date":"","Reference":"","Notes":""},
  {"Payment ID":"P004","Event ID":"","Member ID":"M001","Member Name":"Rtn. Arjun Mehta","Amount":2500,"Description":"District Meet Registration","Category":"Charity / Additional Donations","Quantity":0,"Status":"Paid","Due Date":"2026-05-15","Paid Date":"2026-05-10","Reference":"UPI82736412","Notes":"District conference entry"},
  {"Payment ID":"P005","Event ID":"E001","Member ID":"M002","Member Name":"Rtn. Mrs. Neha Sharma","Amount":1500,"Description":"Membership Fee for Event E001","Category":"Membership Fee","Quantity":0,"Status":"Paid","Due Date":"2026-06-12","Paid Date":"2026-06-12","Reference":"MEETING_COLLECTION","Notes":"Annual dues paid at meeting"},
  {"Payment ID":"P006","Event ID":"E001","Member ID":"M003","Member Name":"Rtn. Sanjay Patel","Amount":600,"Description":"Fellowship Drinks for Event E001","Category":"Fellowship Drinks","Quantity":3,"Status":"Paid","Due Date":"2026-06-12","Paid Date":"2026-06-12","Reference":"MEETING_COLLECTION","Notes":"3 drinks consumed"},
  {"Payment ID":"P007","Event ID":"E001","Member ID":"M005","Member Name":"Rtn. Rahul Verma","Amount":1000,"Description":"Charity / Additional Donations for Event E001","Category":"Charity / Additional Donations","Quantity":0,"Status":"Paid","Due Date":"2026-06-12","Paid Date":"2026-06-12","Reference":"MEETING_COLLECTION","Notes":"Contribution for school project"}
];

const ANNOUNCEMENTS = [
  {"Announcement ID":"AN001","Date":"2026-06-05","Title":"Weekly Meeting Reminder","Content":"Don't forget our weekly meeting on Friday (June 12) at 7:00 PM in Rotary Hall. Guest speaker Rtn. Dr. Anil Kumar will present on global hygiene initiatives.","Created By":"Rtn. Arjun Mehta"},
  {"Announcement ID":"AN002","Date":"2026-06-03","Title":"District Conference Registration","Content":"Registration is officially open for the District Conference on June 28. Interested members, please register early to secure early-bird discounts and accommodation.","Created By":"Rtn. Mrs. Neha Sharma"}
];

const TASKS = [
  {"Task ID":"T001","Event ID":"E001","Title":"Collect pending annual fees","Description":"Follow up with Priya and Arjun regarding their outstanding membership fees.","Assigned Member ID":"M003","Assigned Member Name":"Rtn. Sanjay Patel","Status":"Pending","Target Date":"2026-06-12"},
  {"Task ID":"T002","Event ID":"E001","Title":"Purchase tree saplings","Description":"Procure 100 Neem and Bamboo saplings for the Sapling Plantation Drive.","Assigned Member ID":"M004","Assigned Member Name":"Rtn. Mrs. Priya Shah","Status":"Pending","Target Date":"2026-06-25"},
  {"Task ID":"T003","Event ID":"E001","Title":"Verify Cyclothon doctors booking","Description":"Confirm availability of doctors and medical staff for Glaucoma screening camp at Kowdiar.","Assigned Member ID":"M002","Assigned Member Name":"Rtn. Mrs. Neha Sharma","Status":"Completed","Target Date":"2026-06-20"},
  {"Task ID":"T004","Event ID":"E001","Title":"Finalize Government School HM permission","Description":"Obtain signed official letter of permission from school HM for educational kit distribution.","Assigned Member ID":"M001","Assigned Member Name":"Rtn. Arjun Mehta","Status":"Pending","Target Date":"2026-06-14"},
  {"Task ID":"T005","Event ID":"E001","Title":"Coordinate Cyclothon route approvals","Description":"Liaise with local traffic police for Kowdiar Square cyclothon route and safety approvals.","Assigned Member ID":"M005","Assigned Member Name":"Rtn. Rahul Verma","Status":"Pending","Target Date":"2026-06-19"},
  {"Task ID":"T006","Event ID":"E001","Title":"Draft Cyclothon legal waiver","Description":"Prepare disclaimer and legal waiver form for all registered cyclothon participants.","Assigned Member ID":"M006","Assigned Member Name":"Rtn. Mrs. Meera Iyer","Status":"Pending","Target Date":"2026-06-18"}
];

const PROJECT_NOTES = [
  {"Project Note ID":"PN001","Event ID":"E001","Project Event ID":"E002","Project Name":"School Resource Support Drive","Notes":"Procured 50 bags and books. Distribution coordinator Rtn. Priya confirmed permission from school HM.","Status":"Upcoming"},
  {"Project Note ID":"PN002","Event ID":"E001","Project Event ID":"E003","Project Name":"Glaucoma Awareness Cyclothon","Notes":"Medics and routing volunteers finalized. Cycle renting vendor locked. Flex banners printed.","Status":"Upcoming"},
  {"Project Note ID":"PN003","Event ID":"E001","Project Event ID":"E004","Project Name":"Sapling Plantation Drive","Notes":"100 Neem/Bamboo saplings sponsored by Social Forestry Dept. Volunteers and tools organized.","Status":"Upcoming"}
];

const MINUTES = [
  {"Minute ID":"MN001","Event ID":"E001","Notes":"Meeting started at 7:00 PM with silent invocation. President Arjun welcomed the members. Treasurer Sanjay highlighted target collections for June. District conference registrations were discussed. Meeting adjourned at 8:30 PM.","Date":"2026-06-12","Author":"Rtn. Mrs. Neha Sharma"}
];

const OPINIONS = [
  {"Opinion ID":"O001","Event ID":"E001","Member ID":"M004","Member Name":"Rtn. Mrs. Priya Shah","Opinion Text":"Suggested having more community clean-up projects on Sundays to involve local youths.","Action Required":"Yes","Action Details":"Action: Review feasibility in the next board meeting"}
];

async function seedCollection(collectionName, docs, idField) {
  console.log(`  Seeding ${collectionName} (${docs.length} docs)...`);
  const batch = db.batch();
  for (const item of docs) {
    const docId = item[idField];
    batch.set(db.collection(collectionName).doc(docId), item);
  }
  await batch.commit();
  console.log(`  ✅ ${collectionName} done.`);
}

async function main() {
  console.log('🔥 Seeding Firestore for rotary-club-of-amity-tvm...\n');

  await seedCollection('members', MEMBERS, 'Member ID');
  await seedCollection('events', EVENTS, 'Event ID');
  await seedCollection('attendance', ATTENDANCE, 'Attendance ID');
  await seedCollection('payments', PAYMENTS, 'Payment ID');
  await seedCollection('announcements', ANNOUNCEMENTS, 'Announcement ID');
  await seedCollection('tasks', TASKS, 'Task ID');
  await seedCollection('projectNotes', PROJECT_NOTES, 'Project Note ID');
  await seedCollection('minutes', MINUTES, 'Minute ID');
  await seedCollection('opinions', OPINIONS, 'Opinion ID');

  console.log('\n🎉 All collections seeded successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
