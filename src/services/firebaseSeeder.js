import { db } from "./firebase";
import { api } from "./api";
import { doc, setDoc, collection } from "firebase/firestore";

export const seedFirebaseDatabase = async () => {
  try {
    const mockData = api.getMockCollections();
    
    // We map keys of getMockCollections to their Firestore collection names and ID keys
    const collectionsToSeed = [
      { name: "members", data: mockData.members, idKey: "Member ID" },
      { name: "events", data: mockData.events, idKey: "Event ID" },
      { name: "attendance", data: mockData.attendance, idKey: "Attendance ID" },
      { name: "payments", data: mockData.payments, idKey: "Payment ID" },
      { name: "announcements", data: mockData.announcements, idKey: "Announcement ID" },
      { name: "tasks", data: mockData.tasks, idKey: "Task ID" },
      { name: "projectNotes", data: mockData.projectNotes, idKey: "Project Note ID" },
      { name: "minutes", data: mockData.minutes, idKey: "Minute ID" },
      { name: "opinions", data: mockData.opinions, idKey: "Opinion ID" }
    ];

    for (const col of collectionsToSeed) {
      console.log(`Seeding collection: ${col.name} (${col.data.length} records)...`);
      for (const record of col.data) {
        const id = String(record[col.idKey]);
        const docRef = doc(db, col.name, id);
        await setDoc(docRef, record);
      }
    }
    
    console.log("Firebase database seeded successfully!");
    return { success: true };
  } catch (err) {
    console.error("Failed to seed Firebase database:", err);
    return { success: false, error: err.toString() };
  }
};
