// API Client for Rotary Connect (Google Sheets Backend or Local Mock Mode)

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
export const api = {
  isMock: IS_MOCK_MODE,

  // Fetch all databases
  fetchAllData: async () => {
    if (IS_MOCK_MODE) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        success: true,
        data: {
          members: JSON.parse(localStorage.getItem("rc_members")).map(m => {
            const { ["Password/PIN"]: pin, ...rest } = m;
            return { ...rest, hasPin: !!pin };
          }),
          events: JSON.parse(localStorage.getItem("rc_events")),
          attendance: JSON.parse(localStorage.getItem("rc_attendance")),
          payments: JSON.parse(localStorage.getItem("rc_payments")),
          announcements: JSON.parse(localStorage.getItem("rc_announcements"))
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

  // Auth: Login
  login: async (email, pin) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const members = JSON.parse(localStorage.getItem("rc_members"));
      const member = members.find(m => m["Email"].toLowerCase().trim() === email.toLowerCase().trim());
      
      if (!member) {
        return { success: false, error: "Member email not found" };
      }
      
      const savedPin = String(member["Password/PIN"]).trim();
      if (savedPin === "") {
        return { success: true, needsPinSetup: true, email: member["Email"] };
      }
      
      if (savedPin === String(pin).trim()) {
        const { ["Password/PIN"]: p, ...sanitized } = member;
        return { success: true, member: sanitized };
      } else {
        return { success: false, error: "Incorrect PIN" };
      }
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "login", email, pin })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    }
  },

  // Auth: Set initial PIN
  setPin: async (email, pin) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const members = JSON.parse(localStorage.getItem("rc_members"));
      const memberIndex = members.findIndex(m => m["Email"].toLowerCase().trim() === email.toLowerCase().trim());
      
      if (memberIndex === -1) {
        return { success: false, error: "Member email not found" };
      }
      
      if (String(members[memberIndex]["Password/PIN"]).trim() !== "") {
        return { success: false, error: "PIN is already setup. Contact Admin." };
      }
      
      members[memberIndex]["Password/PIN"] = String(pin).trim();
      localStorage.setItem("rc_members", JSON.stringify(members));
      
      const { ["Password/PIN"]: p, ...sanitized } = members[memberIndex];
      return { success: true, member: sanitized };
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "set_pin", email, pin })
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.toString() };
      }
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

  // Make Payment (Simulated)
  makePayment: async (paymentId, reference) => {
    if (IS_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate bank processing
      const payments = JSON.parse(localStorage.getItem("rc_payments"));
      const index = payments.findIndex(p => p["Payment ID"] === paymentId);
      
      if (index === -1) {
        return { success: false, error: "Payment record not found" };
      }
      
      const today = new Date().toISOString().split('T')[0];
      payments[index]["Status"] = "Paid";
      payments[index]["Paid Date"] = today;
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
  }
};
