// API Client for Rotary Connect (Google Sheets Backend or Local Mock Mode)
import { db } from './firebase';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';

// Temporary helper to clean DB
window.cleanMalformedMembers = async () => {
  try {
    console.log("Cleaning malformed members...");
    const snapshot = await getDocs(collection(db, 'members'));
    let deletedCount = 0;
    
    for (const d of snapshot.docs) {
      const data = d.data();
      const id = d.id;
      const name = data.Name || data["Name (Rotary ID)"] || "";
      
      const isMalformed = 
        !name ||
        name === "" || 
        name.includes("(") || 
        id.startsWith("TMP-") ||
        name.toLowerCase() === "unknown";

      if (isMalformed) {
        console.log(`Deleting malformed member: ID=${id}, Name=${name}`);
        await deleteDoc(d.ref);
        deletedCount++;
      }
    }
    console.log(`Finished cleaning! Deleted ${deletedCount} malformed members.`);
    alert(`Cleaned ${deletedCount} malformed members.`);
  } catch (error) {
    console.error("Error cleaning members:", error);
    alert("Error: " + error.message);
  }
};

const MOCK_MEMBERS = [
  {
    "Member ID": "M001",
    "Name": "Rtn. Arjun Mehta",
    "Mobile": "9876543210",
    "Email": "arjun.mehta@email.com",
    "Role": "President",
    "Classification": "Real Estate",
    "Blood Group": "O+",
    "Birthday": "12 January",
    "Anniversary": "15 February",
    "Join Date": "10 Jan 2023",
    "Password/PIN": "1234",
    "Image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    "Member ID": "M002",
    "Name": "Rtn. Neha Sharma",
    "Mobile": "9876543211",
    "Email": "neha@email.com",
    "Role": "Secretary",
    "Classification": "Education",
    "Blood Group": "A+",
    "Birthday": "05 March",
    "Anniversary": "20 April",
    "Join Date": "12 Jan 2023",
    "Password/PIN": "1111",
    "Image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    "Member ID": "M003",
    "Name": "Rtn. Sanjay Patel",
    "Mobile": "9876543212",
    "Email": "sanjay@email.com",
    "Role": "Treasurer",
    "Classification": "Finance",
    "Blood Group": "B+",
    "Birthday": "22 August",
    "Anniversary": "14 November",
    "Join Date": "05 Feb 2023",
    "Password/PIN": "2222",
    "Image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    "Member ID": "M004",
    "Name": "Rtn. Priya Shah",
    "Mobile": "9876543213",
    "Email": "priya@email.com",
    "Role": "Member",
    "Classification": "Healthcare",
    "Blood Group": "O-",
    "Birthday": "14 September",
    "Anniversary": "28 May",
    "Join Date": "20 Mar 2023",
    "Password/PIN": "3333",
    "Image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    "Member ID": "M005",
    "Name": "Rtn. Rahul Verma",
    "Mobile": "9876543214",
    "Email": "rahul@email.com",
    "Role": "Member",
    "Classification": "Technology",
    "Blood Group": "AB+",
    "Birthday": "12 January", // Colocated with Arjun's birthday for presentation
    "Anniversary": "",
    "Join Date": "01 Jun 2023",
    "Password/PIN": "4444",
    "Image": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    "Member ID": "M006",
    "Name": "Rtn. Meera Iyer",
    "Mobile": "9876543215",
    "Email": "meera@email.com",
    "Role": "Member",
    "Classification": "Legal Services",
    "Blood Group": "A-",
    "Birthday": "18 July",
    "Anniversary": "21 November",
    "Join Date": "15 Aug 2023",
    "Password/PIN": "5555",
    "Image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80"
  }
];

const MOCK_EVENTS = [
  {
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Date": "2026-06-12",
    "Time": "7:00 PM",
    "Venue": "Rotary Hall",
    "Type": "Meeting",
    "Description": "Weekly club meeting and project status reviews."
  },
  {
    "Event ID": "E002",
    "Event Name": "Tree Plantation Drive",
    "Date": "2026-06-15",
    "Time": "8:00 AM",
    "Venue": "City Park",
    "Type": "Service",
    "Description": "Environmental awareness campaign and planting 100+ saplings."
  },
  {
    "Event ID": "E003",
    "Event Name": "Blood Donation Camp",
    "Date": "2026-06-22",
    "Time": "9:00 AM",
    "Venue": "Civil Hospital",
    "Type": "Service",
    "Description": "Annual blood donation camp in association with the Red Cross."
  },
  {
    "Event ID": "E004",
    "Event Name": "District Conference",
    "Date": "2026-06-28",
    "Time": "10:00 AM",
    "Venue": "Hotel Grand",
    "Type": "Social",
    "Description": "Rotary District 3211 annual conference for regional leaders."
  },
  {"Event ID": "E005", "Event Name": "Rotary Chapter Meeting", "Date": "2026-06-13", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E006", "Event Name": "Rotary Chapter Meeting", "Date": "2026-06-27", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E007", "Event Name": "Rotary Chapter Meeting", "Date": "2026-07-11", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E008", "Event Name": "Rotary Chapter Meeting", "Date": "2026-07-25", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E009", "Event Name": "Rotary Chapter Meeting", "Date": "2026-08-08", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E010", "Event Name": "Rotary Chapter Meeting", "Date": "2026-08-22", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E011", "Event Name": "Rotary Chapter Meeting", "Date": "2026-09-12", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E012", "Event Name": "Rotary Chapter Meeting", "Date": "2026-09-26", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E013", "Event Name": "Rotary Chapter Meeting", "Date": "2026-10-10", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E014", "Event Name": "Rotary Chapter Meeting", "Date": "2026-10-24", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E015", "Event Name": "Rotary Chapter Meeting", "Date": "2026-11-14", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E016", "Event Name": "Rotary Chapter Meeting", "Date": "2026-11-28", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E017", "Event Name": "Rotary Chapter Meeting", "Date": "2026-12-12", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E018", "Event Name": "Rotary Chapter Meeting", "Date": "2026-12-26", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E019", "Event Name": "Rotary Chapter Meeting", "Date": "2027-01-09", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E020", "Event Name": "Rotary Chapter Meeting", "Date": "2027-01-23", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E021", "Event Name": "Rotary Chapter Meeting", "Date": "2027-02-13", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E022", "Event Name": "Rotary Chapter Meeting", "Date": "2027-02-27", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E023", "Event Name": "Rotary Chapter Meeting", "Date": "2027-03-13", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E024", "Event Name": "Rotary Chapter Meeting", "Date": "2027-03-27", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E025", "Event Name": "Rotary Chapter Meeting", "Date": "2027-04-10", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E026", "Event Name": "Rotary Chapter Meeting", "Date": "2027-04-24", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E027", "Event Name": "Rotary Chapter Meeting", "Date": "2027-05-08", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."},
  {"Event ID": "E028", "Event Name": "Rotary Chapter Meeting", "Date": "2027-05-22", "Time": "7:00 PM", "Venue": "Rotary Hall", "Type": "Meeting", "Description": "Regular bi-weekly chapter meeting for Amity Trivandrum Rotary Chapter."}
];

const MOCK_ATTENDANCE = [
  {
    "Attendance ID": "AD001",
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Member ID": "M001",
    "Member Name": "Rtn. Arjun Mehta",
    "Status": "Present",
    "Date": "2026-06-12"
  },
  {
    "Attendance ID": "AD002",
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Member ID": "M002",
    "Member Name": "Rtn. Neha Sharma",
    "Status": "Present",
    "Date": "2026-06-12"
  },
  {
    "Attendance ID": "AD003",
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Member ID": "M003",
    "Member Name": "Rtn. Sanjay Patel",
    "Status": "Present",
    "Date": "2026-06-12"
  },
  {
    "Attendance ID": "AD004",
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Member ID": "M004",
    "Member Name": "Rtn. Priya Shah",
    "Status": "Present",
    "Date": "2026-06-12"
  },
  {
    "Attendance ID": "AD005",
    "Event ID": "E001",
    "Event Name": "Weekly Meeting",
    "Member ID": "M005",
    "Member Name": "Rtn. Rahul Verma",
    "Status": "Absent",
    "Date": "2026-06-12"
  }
];

const MOCK_PAYMENTS = [
  {
    "Payment ID": "P001",
    "Member ID": "M001",
    "Member Name": "Rtn. Arjun Mehta",
    "Amount": 1500,
    "Description": "Membership Fee 2026",
    "Status": "Pending",
    "Due Date": "2026-06-30",
    "Paid Date": "",
    "Reference": ""
  },
  {
    "Payment ID": "P002",
    "Member ID": "M002",
    "Member Name": "Rtn. Neha Sharma",
    "Amount": 1500,
    "Description": "Membership Fee 2026",
    "Status": "Paid",
    "Due Date": "2026-06-30",
    "Paid Date": "2026-06-01",
    "Reference": "TXN9876543"
  },
  {
    "Payment ID": "P003",
    "Member ID": "M004",
    "Member Name": "Rtn. Priya Shah",
    "Amount": 1500,
    "Description": "Membership Fee 2026",
    "Status": "Pending",
    "Due Date": "2026-06-30",
    "Paid Date": "",
    "Reference": ""
  },
  {
    "Payment ID": "P004",
    "Member ID": "M001",
    "Member Name": "Rtn. Arjun Mehta",
    "Amount": 2500,
    "Description": "District Meet Registration",
    "Status": "Paid",
    "Due Date": "2026-05-15",
    "Paid Date": "2026-05-10",
    "Reference": "UPI82736412"
  }
];

const MOCK_ANNOUNCEMENTS = [
  {
    "Announcement ID": "AN001",
    "Date": "2026-06-05",
    "Title": "Weekly Meeting Reminder",
    "Content": "Don't forget our weekly meeting on Friday (June 12) at 7:00 PM in Rotary Hall. Guest speaker Rtn. Dr. Anil Kumar will present on global hygiene initiatives.",
    "Created By": "Rtn. Arjun Mehta"
  },
  {
    "Announcement ID": "AN002",
    "Date": "2026-06-03",
    "Title": "District Conference Registration",
    "Content": "Registration is officially open for the District Conference on June 28. Interested members, please register early to secure early-bird discounts and accommodation.",
    "Created By": "Rtn. Neha Sharma"
  }
];

// Determine if we are in Mock mode or Live Sheets mode
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";
const IS_MOCK_MODE = APPS_SCRIPT_URL.trim() === "";

// Helper to initialize local storage
function initLocalStorage() {
  if (IS_MOCK_MODE) {
    const currentEvents = localStorage.getItem("rc_events") ? JSON.parse(localStorage.getItem("rc_events")) : [];
    if (!localStorage.getItem("rc_members") || currentEvents.length <= 4) {
      localStorage.setItem("rc_members", JSON.stringify(MOCK_MEMBERS));
      localStorage.setItem("rc_events", JSON.stringify(MOCK_EVENTS));
      localStorage.setItem("rc_attendance", JSON.stringify(MOCK_ATTENDANCE));
      localStorage.setItem("rc_payments", JSON.stringify(MOCK_PAYMENTS));
      localStorage.setItem("rc_announcements", JSON.stringify(MOCK_ANNOUNCEMENTS));
      console.log("Mock database initialized/updated in LocalStorage.");
    }
  }
}

initLocalStorage();

// API Object exposing operations
let activeChapterId = null;

export const setApiChapterId = (id) => {
  activeChapterId = id;
};

export const api = {
  isMock: IS_MOCK_MODE,

  // Fetch all databases
  fetchAllData: async () => {
    if (IS_MOCK_MODE) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));

      let membersList = [];
      if (activeChapterId) {
        try {
          const snap = await Promise.race([
            getDocs(collection(db, "chapters", activeChapterId, "members")),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase timeout")), 5000))
          ]);
          membersList = snap.docs.map(doc => {
            const d = doc.data();
            const { "Password/PIN": pin, ...rest } = d;
            return { id: doc.id, ...rest, hasPin: !!pin || !!d.Pin };
          });
        } catch (err) {
          console.error("Error fetching members from firebase:", err);
        }
      } 
      
      if (membersList.length === 0) {
        membersList = JSON.parse(localStorage.getItem("rc_members") || "[]").map(m => {
          const { ["Password/PIN"]: pin, ...rest } = m;
          return { ...rest, hasPin: !!pin };
        });
      }

      // Sort alphabetically by name
      membersList.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));

      return {
        success: true,
        data: {
          members: membersList,
          events: JSON.parse(localStorage.getItem("rc_events") || "[]"),
          attendance: JSON.parse(localStorage.getItem("rc_attendance") || "[]"),
          payments: JSON.parse(localStorage.getItem("rc_payments") || "[]"),
          announcements: JSON.parse(localStorage.getItem("rc_announcements") || "[]")
        }
      };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL);
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  listAllChapters: async () => {
    try {
      const snap = await getDocs(collection(db, "chapters"));
      const chapters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, chapters };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  createChapter: async (chapterId, name) => {
    try {
      await setDoc(doc(db, "chapters", chapterId), { name, status: "active", createdAt: new Date().toISOString() });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getGlobalRoles: async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "globalRoles"));
      if (docSnap.exists()) {
        return { success: true, roles: docSnap.data().roles || [] };
      }
      return { success: true, roles: ["President", "Secretary", "Treasurer"] }; // Defaults
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  saveGlobalRoles: async (roles) => {
    try {
      await setDoc(doc(db, "settings", "globalRoles"), { roles }, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  assignChapterRole: async (chapterId, memberId, roleName) => {
    try {
      const batch = writeBatch(db);

      // 1. Find if someone in the chapter already has this role and demote them
      const membersRef = collection(db, "chapters", chapterId, "members");
      const qOldRole = query(membersRef, where("Role", "==", roleName));
      const oldSnap = await getDocs(qOldRole);
      
      for (const oldDoc of oldSnap.docs) {
        if (oldDoc.id !== memberId) {
          batch.update(doc(db, "users", oldDoc.id), { Role: "Member" });
          batch.update(doc(db, "chapters", chapterId, "members", oldDoc.id), { Role: "Member" });
        }
      }

      // 2. Assign the new user to this role
      if (memberId) {
        batch.update(doc(db, "users", memberId), { Role: roleName, chapterId, status: "active" });
        batch.set(doc(db, "chapters", chapterId, "members", memberId), { Role: roleName, chapterId, status: "active" }, { merge: true });
      }

      await batch.commit();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  registerMember: async (userData) => {
    try {
      const userId = Date.now().toString();
      const ref = doc(db, "users", userId);
      await setDoc(ref, { ...userData, "Member ID": userId, status: "pending", Role: "Member" });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getPendingMembers: async () => {
    try {
      const q = query(collection(db, "users"), where("chapterId", "==", activeChapterId), where("status", "==", "pending"));
      const snap = await getDocs(q);
      return { success: true, pending: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approveMember: async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return { success: false, error: "Not found" };
      await updateDoc(userRef, { status: "active" });
      await setDoc(doc(db, "chapters", activeChapterId, "members", userId), { ...userSnap.data(), status: "active" }, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectMember: async (userId) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  changeMemberRole: async (userId, newRole) => {
    try {
      if (["President", "Secretary", "Treasurer"].includes(newRole)) {
        const snap = await getDocs(query(collection(db, "chapters", activeChapterId, "members"), where("Role", "==", newRole)));
        for (const d of snap.docs) {
          if (d.id !== userId) {
            await updateDoc(doc(db, "users", d.id), { Role: "Member" });
            await updateDoc(doc(db, "chapters", activeChapterId, "members", d.id), { Role: "Member" });
          }
        }
      }
      await updateDoc(doc(db, "users", userId), { Role: newRole });
      await updateDoc(doc(db, "chapters", activeChapterId, "members", userId), { Role: newRole });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  proposeMemberDeletion: async (chapterId, userId, notes, initiatorRole, duesAction) => {
    try {
      const existingQuery = query(collection(db, "chapters", chapterId, "deletion_requests"), where("userId", "==", userId), where("status", "==", "pending"));
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        return { success: false, error: "A pending deletion request already exists for this member." };
      }

      const reqId = Date.now().toString();
      const userSnap = await getDoc(doc(db, "users", userId));
      
      const paymentsRes = await api.getMemberPayments(userId);
      const pendingDuesAmount = (paymentsRes.pending || []).reduce((sum, p) => sum + Number(p["Amount"] || 0), 0);

      let pendingApprovals = ["President", "Secretary", "Treasurer"];
      if (pendingApprovals.includes(initiatorRole)) {
        pendingApprovals = pendingApprovals.filter(r => r !== initiatorRole);
      }
      const reqPayload = {
        userId, 
        userName: memberName, 
        notes, 
        duesAction: duesAction || "none",
        pendingDuesAmount,
        pendingApprovals, 
        status: "pending", 
        timestamp: reqId
      };
      await setDoc(doc(db, "chapters", chapterId, "deletion_requests", reqId), reqPayload);
      await api.logActivity(chapterId, "Requested member deletion", `Requested deletion for ${memberName}`);
      return { success: true, id: reqId };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getDeletionRequests: async (chapterId) => {
    try {
      const snap = await getDocs(query(collection(db, "chapters", chapterId, "deletion_requests"), where("status", "==", "pending")));
      return { success: true, requests: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectDeletionRequest: async (chapterId, requestId) => {
    try {
      const ref = doc(db, "chapters", chapterId, "deletion_requests", requestId);
      await updateDoc(ref, { status: "rejected" });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getMemberPayments: async (memberId) => {
    try {
      const payments = JSON.parse(localStorage.getItem("rc_payments") || "[]");
      const pending = payments.filter(p => String(p["Member ID"]) === String(memberId) && p["Status"] !== "Paid" && p["Status"] !== "Waived");
      return { success: true, pending };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  clearMemberPayments: async (memberId, action) => {
    try {
      const payments = JSON.parse(localStorage.getItem("rc_payments") || "[]");
      let totalToWaive = 0;
      let mName = "Unknown";
      
      payments.forEach(p => {
        if (String(p["Member ID"]) === String(memberId) && p["Status"] !== "Paid" && p["Status"] !== "Waived") {
          if (action === "cleared") {
            p["Status"] = "Paid";
            p["Paid Date"] = new Date().toISOString().split('T')[0];
            p["Reference"] = "Cleared on removal";
          } else if (action === "waiver_requested") {
            totalToWaive += Number(p["Amount"] || 0);
            mName = p["Member Name"] || "Unknown";
            p["Status"] = "Paid";
            p["Paid Date"] = new Date().toISOString().split('T')[0];
            p["Reference"] = "Waived on removal";
          }
        }
      });

      if (action === "waiver_requested" && totalToWaive > 0) {
        payments.push({
          "Payment ID": `WAIVER-REV-${Date.now()}`,
          "Member ID": memberId,
          "Member Name": mName,
          "Description": "Dues Waiver Reversal",
          "Amount": -totalToWaive,
          "Status": "Paid", 
          "Date": new Date().toISOString().split('T')[0],
          "Paid Date": new Date().toISOString().split('T')[0],
          "Reference": "Reversal entry for waived dues on member removal",
          "Event ID": ""
        });
      }

      localStorage.setItem("rc_payments", JSON.stringify(payments));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approveDeletionRequest: async (chapterId, requestId, approverRole) => {
    try {
      const ref = doc(db, "chapters", chapterId, "deletion_requests", requestId);
      const snap = await getDoc(ref);
      const data = snap.data();
      let pendingApprovals = data.pendingApprovals || [];
      let approvedBy = data.approvedBy || [];
      
      if (pendingApprovals.includes(approverRole)) {
        pendingApprovals = pendingApprovals.filter(r => r !== approverRole);
        if (!approvedBy.includes(approverRole)) approvedBy.push(approverRole);
      }

      if (pendingApprovals.length === 0) {
        await updateDoc(doc(db, "users", data.userId), { 
          chapterId: null, 
          status: "orphaned", 
          Role: "Member",
          noDuesCertificateIssued: data.duesAction === 'cleared' || data.duesAction === 'waiver_requested' 
        });
        await deleteDoc(doc(db, "chapters", chapterId, "members", data.userId));
        await updateDoc(ref, { pendingApprovals, approvedBy, status: "approved" });
        
        if (data.duesAction !== 'none') {
          await api.clearMemberPayments(data.userId, data.duesAction);
        }
      } else {
        await updateDoc(ref, { pendingApprovals, approvedBy });
      }
      
      await api.logActivity(chapterId, "Approved member deletion", `Approved deletion for ${data.userName}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  logActivity: async (chapterId, action, details) => {
    try {
      await addDoc(collection(db, "chapters", chapterId, "activities"), {
        action,
        details,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getActivities: async (chapterId) => {
    try {
      const q = query(collection(db, "chapters", chapterId, "activities"), orderBy("timestamp", "desc"), limit(50));
      const snap = await getDocs(q);
      return { success: true, activities: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  inductMember: async (userId, targetChapterId) => {
    try {
      const userSnap = await getDoc(doc(db, "users", userId));
      if (!userSnap.exists()) return { success: false, error: "Not found" };
      const d = userSnap.data();
      if (d.chapterId && d.chapterId !== targetChapterId && d.status === "active") return { success: false, error: "Already active in another chapter" };
      await updateDoc(doc(db, "users", userId), { chapterId: targetChapterId, status: "active", Role: "Member" });
      await setDoc(doc(db, "chapters", targetChapterId, "members", userId), { ...d, chapterId: targetChapterId, status: "active", Role: "Member" }, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getChapterMembers: async (chapterId) => {
    try {
      const snap = await getDocs(collection(db, "chapters", chapterId, "members"));
      const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      members.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
      return { success: true, members };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getOrphanedMembers: async () => {
    try {
      const q = query(collection(db, "users"), where("status", "==", "orphaned"));
      const snap = await getDocs(q);
      const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      members.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
      return { success: true, members };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  bulkUploadMembers: async (chapterId, membersList) => {
    try {
      const batch = writeBatch(db);
      const results = [];
      let added = 0;

      for (const member of membersList) {
        const userId = member["Member ID"];
        if (!userId) continue;

        const userData = {
          "Name": member.Name || "Unknown",
          "Member ID": userId,
          "Email": member.Email || `${userId}@rotary.org`,
          "Role": "Member",
          "Pin": "1234",
          "chapterId": chapterId,
          "status": "active"
        };
        
        if (member.Gender) userData.Gender = member.Gender;
        if (member.Mobile) userData.Mobile = member.Mobile;
        if (member.Address) userData.Address = member.Address;
        if (member.Profession) userData.Profession = member.Profession;
        if (member["Spouse Name"]) userData["Spouse Name"] = member["Spouse Name"];
        if (member.DOB) userData.DOB = member.DOB;

        batch.set(doc(db, "users", userId), userData, { merge: true });
        batch.set(doc(db, "chapters", chapterId, "members", userId), userData, { merge: true });

        added++;
        results.push(userData);
      }

      if (added > 0) await batch.commit();
      return { success: true, count: added, members: results };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  // Auth: Login
  login: async (email, pin) => {
    try {
      // First check if it's the super admin
      if (email.toLowerCase().trim() === "admin@rotary.org") {
        if (String(pin).trim() === "0000") {
          return {
            success: true,
            member: { Name: "Super Admin", Email: "admin@rotary.org", isSuperAdmin: true, Role: "Super Admin" }
          };
        } else {
          return { success: false, error: "Incorrect PIN" };
        }
      }

      const q = query(collection(db, "users"), where("Email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, error: "Member email not found" };
      }
      
      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      
      const savedPin = String(userData.Pin || userData["Password/PIN"] || "").trim();
      
      if (savedPin === "") {
        return { success: true, needsPinSetup: true, email: userData.Email };
      }
      
      if (savedPin === String(pin).trim()) {
        const { Pin, "Password/PIN": p, ...sanitized } = userData;
        return { success: true, member: { id: userDoc.id, ...sanitized } };
      } else {
        return { success: false, error: "Incorrect PIN" };
      }
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  // Auth: Set initial PIN
  setPin: async (email, pin) => {
    try {
      const q = query(collection(db, "users"), where("Email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, error: "Member email not found" };
      }
      
      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      
      const savedPin = String(userData.Pin || userData["Password/PIN"] || "").trim();
      if (savedPin !== "") {
        return { success: false, error: "PIN is already setup. Contact Admin." };
      }
      
      await updateDoc(doc(db, "users", userDoc.id), { Pin: String(pin).trim() });
      if (userData.chapterId) {
        await updateDoc(doc(db, "chapters", userData.chapterId, "members", userDoc.id), { Pin: String(pin).trim() });
      }
      
      const { Pin, "Password/PIN": p, ...sanitized } = userData;
      return { success: true, member: { id: userDoc.id, ...sanitized } };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  // Mark Attendance
  markAttendance: async (eventId, eventName, attendanceList, dateStr) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const attendance = JSON.parse(localStorage.getItem("rc_attendance"));
      
      attendanceList.forEach(item => {
        const existingIndex = attendance.findIndex(a => a["Event ID"] === eventId && a["Member ID"] === item.memberId);
        
        if (existingIndex > -1) {
          attendance[existingIndex]["Status"] = item.status;
          attendance[existingIndex]["Date"] = dateStr;
        } else {
          const nextId = "AD" + String(attendance.length + 1).padStart(3, '0');
          attendance.push({
            "Attendance ID": nextId,
            "Event ID": eventId,
            "Event Name": eventName,
            "Member ID": item.memberId,
            "Member Name": item.memberName,
            "Status": item.status,
            "Date": dateStr
          });
        }
      });
      
      localStorage.setItem("rc_attendance", JSON.stringify(attendance));
      return { success: true };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "mark_attendance", eventId, eventName, attendanceList, date: dateStr })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  // Create Event
  addEvent: async (event) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const events = JSON.parse(localStorage.getItem("rc_events"));
      const nextId = "E" + String(events.length + 1).padStart(3, '0');
      
      const newEvent = {
        "Event ID": nextId,
        "Event Name": event.eventName,
        "Date": event.date,
        "Time": event.time,
        "Venue": event.venue,
        "Type": event.type,
        "Description": event.description
      };
      
      events.push(newEvent);
      localStorage.setItem("rc_events", JSON.stringify(events));
      return { success: true, id: nextId };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "add_event", event })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  // Create Announcement
  addAnnouncement: async (announcement) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const announcements = JSON.parse(localStorage.getItem("rc_announcements"));
      const nextId = "AN" + String(announcements.length + 1).padStart(3, '0');
      
      const newAnnouncement = {
        "Announcement ID": nextId,
        "Date": announcement.date,
        "Title": announcement.title,
        "Content": announcement.content,
        "Created By": announcement.createdBy
      };
      
      announcements.push(newAnnouncement);
      localStorage.setItem("rc_announcements", JSON.stringify(announcements));
      return { success: true, id: nextId };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "add_announcement", announcement })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  createReceivables: async (membersToCharge, category, amount, description, dueDate, eventId) => {
    try {
      const payments = JSON.parse(localStorage.getItem("rc_payments") || "[]");
      
      const newPayments = membersToCharge.map(member => {
        return {
          "Payment ID": `P${Date.now()}${Math.floor(Math.random() * 1000)}`,
          "Member ID": member["Member ID"] || member.id,
          "Member Name": member["Name"],
          "Amount": amount,
          "Description": description,
          "Category": category || "Fee",
          "Status": "Pending",
          "Due Date": dueDate,
          "Paid Date": "",
          "Reference": "",
          "Event ID": eventId || "",
          "Notes": ""
        };
      });

      const updatedPayments = [...payments, ...newPayments];
      localStorage.setItem("rc_payments", JSON.stringify(updatedPayments));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  // Make Payment (Simulated)
  submitPaymentReference: async (paymentId, reference) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      const payments = JSON.parse(localStorage.getItem("rc_payments"));
      const index = payments.findIndex(p => p["Payment ID"] === paymentId);
      
      if (index === -1) {
        return { success: false, error: "Payment record not found" };
      }
      
      payments[index]["Status"] = "Verification Pending";
      payments[index]["Reference"] = reference;
      
      localStorage.setItem("rc_payments", JSON.stringify(payments));
      return { success: true };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "make_payment", paymentId, reference })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  verifyPayment: async (paymentId) => {
    if (IS_MOCK_MODE) {
      const payments = JSON.parse(localStorage.getItem("rc_payments"));
      const index = payments.findIndex(p => p["Payment ID"] === paymentId);
      if (index > -1) {
        payments[index]["Status"] = "Paid";
        payments[index]["Paid Date"] = new Date().toISOString().split('T')[0];
        localStorage.setItem("rc_payments", JSON.stringify(payments));
      }
      return { success: true };
    }
  },

  rejectPaymentVerification: async (paymentId) => {
    if (IS_MOCK_MODE) {
      const payments = JSON.parse(localStorage.getItem("rc_payments"));
      const index = payments.findIndex(p => p["Payment ID"] === paymentId);
      if (index > -1) {
        payments[index]["Status"] = "Pending";
        payments[index]["Reference"] = "";
        localStorage.setItem("rc_payments", JSON.stringify(payments));
      }
      return { success: true };
    }
  },

  logActivity: async (chapterId, title, description) => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "chapters", chapterId, "activities"), {
        userId: auth.currentUser.uid,
        title,
        description,
        timestamp: new Date().toISOString()
      });
    } catch (e) { console.error("Error logging activity:", e); }
  },

  getMyActivities: async (chapterId, userId) => {
    try {
      const q = query(collection(db, "chapters", chapterId, "activities"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      return list;
    } catch (e) {
      console.error("Error getting activities:", e);
      return [];
    }
  }
};
