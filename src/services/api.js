import { db, storage, functions } from './firebase';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, updateDoc, query, where, writeBatch, deleteField, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { calculateMemberBadges } from '../utils/badges';

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

// API Object exposing operations
let activeChapterId = null;

export const setApiChapterId = (id) => {
  activeChapterId = id;
};

export const api = {
  // Fetch all databases
  fetchAllData: async () => {
    let membersList = [];
    let feedbacksList = [];
    let eventsList = [];
    let attendanceList = [];
    let paymentsList = [];
    let announcementsList = [];
    let paymentEditsList = [];
    let opinionsList = [];
    let clubDetailsEditsList = [];

    if (activeChapterId) {
      try {
        const [membersSnap, feedbacksSnap, eventsSnap, attendanceSnap, paymentsSnap, announcementsSnap, paymentEditsSnap, opinionsSnap, chapterSnap, clubDetailsEditsSnap] = await Promise.all([
          getDocs(collection(db, "chapters", activeChapterId, "members")),
          getDocs(collection(db, "chapters", activeChapterId, "feedbacks")),
          getDocs(collection(db, "chapters", activeChapterId, "events")),
          getDocs(collection(db, "chapters", activeChapterId, "attendance")),
          getDocs(collection(db, "chapters", activeChapterId, "payments")),
          getDocs(collection(db, "chapters", activeChapterId, "announcements")),
          getDocs(collection(db, "chapters", activeChapterId, "payment_edits")),
          getDocs(collection(db, "chapters", activeChapterId, "opinions")),
          getDoc(doc(db, "chapters", activeChapterId)),
          getDocs(collection(db, "chapters", activeChapterId, "club_details_edits"))
        ]);

        membersList = membersSnap.docs.map(doc => {
          const d = doc.data();
          const { "Password/PIN": pin, ...rest } = d;
          return { id: doc.id, ...rest, hasPin: !!pin || !!d.Pin };
        });
        
        feedbacksList = feedbacksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        eventsList = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        attendanceList = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        paymentsList = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        announcementsList = announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        paymentEditsList = paymentEditsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        opinionsList = opinionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        clubDetailsEditsList = clubDetailsEditsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let chapterData = chapterSnap.exists() ? chapterSnap.data() : {};
        var chapterConfig = chapterData.clubDetails || {};

      } catch (err) {
        console.error("Error fetching data from firebase:", err);
        return { success: false, error: err.toString() };
      }
    } 
    
    // Sort alphabetically by name
    membersList.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));

    const result = {
      success: true,
      data: {
        members: membersList,
        events: eventsList,
        attendance: attendanceList,
        payments: paymentsList,
        paymentEdits: paymentEditsList,
        announcements: announcementsList,
        opinions: opinionsList,
        feedbacks: feedbacksList.sort((a,b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)),
        clubDetails: typeof chapterConfig !== 'undefined' ? chapterConfig : {},
        clubDetailsEdits: clubDetailsEditsList
      }
    };
    
    // Dynamically calculate badges for each member
    result.data.members = result.data.members.map(member => {
      const calculatedBadges = calculateMemberBadges(
        member["Member ID"] || member.id,
        result.data.payments,
        result.data.attendance,
        result.data.feedbacks,
        result.data.opinions
      );
      
      // Merge with any manually awarded or custom badges in the DB (like Paul Harris Fellow)
      const existingBadges = member.badges || [];
      // If we just want all badges, we can just concat them
      const allBadges = [...existingBadges, ...calculatedBadges];
      
      return { ...member, badges: allBadges };
    });

    return result;
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
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.globalRoles && Array.isArray(data.globalRoles)) {
          return { success: true, roles: data.globalRoles };
        }
      }
      return { success: true, roles: ["President", "Secretary", "Treasurer"] }; // Defaults
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getMember: async (chapterId, memberId) => {
    try {
      const docSnap = await getDoc(doc(db, "chapters", chapterId, "members", memberId));
      if (docSnap.exists()) return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      return { success: false, error: "Not found" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  endorseMember: async (chapterId, targetMemberId, endorserName, badgeId) => {
    try {
      const memberRef = doc(db, "chapters", chapterId, "members", targetMemberId);
      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) {
        return { success: false, error: "Member not found" };
      }
      
      const memberData = memberSnap.data();
      const endorsements = memberData.endorsements || [];
      
      endorsements.push({
        id: Date.now().toString(),
        badgeId,
        endorserName,
        date: new Date().toISOString()
      });
      
      await updateDoc(memberRef, { endorsements });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  addOpinion: async (eventId, memberId, memberName, opinionText, actionRequired, actionDetails, actionAssignee) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const docId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, "chapters", activeChapterId, "opinions", docId), {
        "Opinion ID": docId,
        "Event ID": eventId,
        "Member ID": memberId,
        "Member Name": memberName,
        "Opinion Text": opinionText,
        "Action Required": actionRequired,
        "Action Details": actionDetails,
        "Action Assignee": actionAssignee || null,
        "timestamp": new Date().toISOString()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  updateOpinionAction: async (opinionId, actionDetails, actionAssignee) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await setDoc(opinionRef, {
        "Action Required": "Yes",
        "Action Details": actionDetails,
        "Action Assignee": actionAssignee,
        "Action Status": "Pending"
      }, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  updateOpinionStatus: async (opinionId, newStatus) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await updateDoc(opinionRef, {
        "Action Status": newStatus
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },


  // Deletion Workflow
  requestDeleteOpinion: async (opinionId, memberId, memberName) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await updateDoc(opinionRef, {
        deletionRequestedBy: memberId,
        deletionRequestedByName: memberName,
        deletionApprovals: []
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approveDeleteOpinion: async (opinionId, memberId) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      const snap = await getDoc(opinionRef);
      if (!snap.exists()) return { success: false, error: "Not found" };
      
      const data = snap.data();
      const approvals = data.deletionApprovals || [];
      if (!approvals.includes(memberId)) approvals.push(memberId);
      
      if (approvals.length >= 1) { // 1 additional PST member
        await deleteDoc(opinionRef);
      } else {
        await updateDoc(opinionRef, { deletionApprovals: approvals });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectDeleteOpinion: async (opinionId) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await updateDoc(opinionRef, {
        deletionRequestedBy: deleteField(),
        deletionRequestedByName: deleteField(),
        deletionApprovals: deleteField()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  // Edit Workflow
  requestEditOpinion: async (opinionId, memberId, memberName, proposedText, proposedDetails) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await updateDoc(opinionRef, {
        editRequestedBy: memberId,
        editRequestedByName: memberName,
        proposedText: proposedText || null,
        proposedDetails: proposedDetails || null,
        editApprovals: []
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approveEditOpinion: async (opinionId, memberId) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      const snap = await getDoc(opinionRef);
      if (!snap.exists()) return { success: false, error: "Not found" };
      
      const data = snap.data();
      const approvals = data.editApprovals || [];
      if (!approvals.includes(memberId)) approvals.push(memberId);
      
      if (approvals.length >= 1) { // 1 additional PST member
        const updates = {
          editRequestedBy: deleteField(),
          editRequestedByName: deleteField(),
          proposedText: deleteField(),
          proposedDetails: deleteField(),
          editApprovals: deleteField()
        };
        
        if (data.proposedText) updates["Opinion Text"] = data.proposedText;
        if (data.proposedDetails) updates["Action Details"] = data.proposedDetails;
        
        await updateDoc(opinionRef, updates);
      } else {
        await updateDoc(opinionRef, { editApprovals: approvals });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectEditOpinion: async (opinionId) => {
    try {
      if (!activeChapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", activeChapterId, "opinions", opinionId);
      await updateDoc(opinionRef, {
        editRequestedBy: deleteField(),
        editRequestedByName: deleteField(),
        proposedText: deleteField(),
        proposedDetails: deleteField(),
        editApprovals: deleteField()
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  voteOpinion: async (chapterId, opinionId, memberId) => {
    try {
      if (!chapterId) throw new Error("No active chapter");
      const opinionRef = doc(db, "chapters", chapterId, "opinions", opinionId);
      const opinionSnap = await getDoc(opinionRef);
      if (!opinionSnap.exists()) {
        return { success: false, error: "Opinion not found" };
      }
      
      const data = opinionSnap.data();
      
      if (data.memberId === memberId) {
        return { success: false, error: "Self-voting is not allowed" };
      }
      
      let votes = data.votes || [];
      if (votes.includes(memberId)) {
        votes = votes.filter(id => id !== memberId);
      } else {
        votes.push(memberId);
      }
      
      await updateDoc(opinionRef, { votes });
      if (votes.includes(memberId)) {
        await api.logActivity(chapterId, memberId, "Supported a Motion", `You supported: ${data.Title || "a motion"}`);
      }
      return { success: true, votes };
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
      await setDoc(ref, { 
        ...userData, 
        "Member ID": userId, 
        status: "pending", 
        Role: "Member",
        ReferredBy: userData.ReferredBy || ""
      });
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
      const userData = userSnap.data();

      await updateDoc(userRef, { status: "active" });
      await setDoc(doc(db, "chapters", activeChapterId, "members", userId), { ...userData, status: "active" }, { merge: true });

      // Referral Bonus Logic
      if (userData.ReferredBy && activeChapterId) {
        try {
          const chapRef = doc(db, "chapters", activeChapterId);
          const chapSnap = await getDoc(chapRef);
          if (chapSnap.exists()) {
            const chapData = chapSnap.data();
            const bonusAmount = Number(chapData.referralBonusAmount);
            if (!isNaN(bonusAmount) && bonusAmount > 0) {
              const paymentId = "P" + Date.now();
              const pRef = doc(db, "chapters", activeChapterId, "payments", paymentId);
              await setDoc(pRef, {
                "Payment ID": paymentId,
                "Member ID": userData.ReferredBy.trim(),
                "Amount": -Math.abs(bonusAmount),
                "Category": "Referral Bonus",
                "Description": `Bonus for referring ${userData.Name}`,
                "Status": "Paid",
                "Due Date": new Date().toISOString().split('T')[0],
                "Paid Date": new Date().toISOString().split('T')[0]
              });
              await api.logActivity(activeChapterId, userData.ReferredBy.trim(), "Referral Bonus Earned", `You earned a referral bonus of ₹${bonusAmount} for referring ${userData.Name}.`);
            }
          }
        } catch (e) {
          console.error("Error processing referral bonus", e);
        }
      }

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

  superAdminRemoveMember: async (chapterId, userId) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", userId));
      batch.delete(doc(db, "chapters", chapterId, "members", userId));
      await batch.commit();
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
      await api.logActivity(chapterId, memberId, "Requested member deletion", `Requested deletion for ${memberName}`);
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
      if (!activeChapterId) return { success: false, error: "No active chapter" };
      const q = query(collection(db, "chapters", activeChapterId, "payments"), where("Member ID", "==", memberId));
      const snap = await getDocs(q);
      const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pending = payments.filter(p => p["Status"] !== "Paid" && p["Status"] !== "Waived");
      return { success: true, pending };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  clearMemberPayments: async (memberId, action) => {
    try {
      if (!activeChapterId) return { success: false, error: "No active chapter" };
      const q = query(collection(db, "chapters", activeChapterId, "payments"), where("Member ID", "==", memberId));
      const snap = await getDocs(q);
      
      const batch = writeBatch(db);
      let totalToWaive = 0;
      let mName = "Unknown";
      
      snap.docs.forEach(docSnap => {
        const p = docSnap.data();
        if (p["Status"] !== "Paid" && p["Status"] !== "Waived") {
          if (action === "cleared") {
            batch.update(docSnap.ref, {
              Status: "Paid",
              "Paid Date": new Date().toISOString().split('T')[0],
              Reference: "Cleared on removal"
            });
          } else if (action === "waiver_requested") {
            totalToWaive += Number(p["Amount"] || 0);
            mName = p["Member Name"] || "Unknown";
            batch.update(docSnap.ref, {
              Status: "Paid",
              "Paid Date": new Date().toISOString().split('T')[0],
              Reference: "Waived on removal"
            });
          }
        }
      });

      if (action === "waiver_requested" && totalToWaive > 0) {
        const reversalId = `WAIVER-REV-${Date.now()}`;
        batch.set(doc(db, "chapters", activeChapterId, "payments", reversalId), {
          "Payment ID": reversalId,
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

      await batch.commit();
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
      
      await api.logActivity(chapterId, data.userId, "Approved member deletion", `Approved deletion for ${data.userName}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  logActivity: async (chapterId, userId, title, description) => {
    try {
      await addDoc(collection(db, "chapters", chapterId, "activities"), {
        userId,
        title,
        description,
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
      // Fetch existing members so we don't overwrite Role/Pin on updates
      const existingSnap = await getDocs(collection(db, "chapters", chapterId, "members"));
      const existingIds = new Set();
      existingSnap.forEach(doc => existingIds.add(doc.id));

      const batch = writeBatch(db);
      const results = [];
      let added = 0;

      for (const member of membersList) {
        const userId = member["Member ID"];
        if (!userId) continue;

        const isExisting = existingIds.has(userId);

        const userData = {
          "Name": member.Name || "Unknown",
          "Member ID": userId,
          "chapterId": chapterId
        };
        
        if (member.Email) userData.Email = member.Email;
        if (!isExisting && !member.Email) userData.Email = `${userId}@rotary.org`;
        
        if (member["Rotary ID"]) userData["Rotary ID"] = member["Rotary ID"];
        if (member.Gender) userData.Gender = member.Gender;
        if (member.Mobile) userData.Mobile = member.Mobile;
        if (member.Address) userData.Address = member.Address;
        if (member.Profession) userData.Profession = member.Profession;
        if (member["Spouse Name"]) userData["Spouse Name"] = member["Spouse Name"];
        if (member.Birthday) userData.Birthday = member.Birthday;
        if (isExisting) userData.DOB = deleteField(); // Clean up old DOB field if it exists

        // Only set default Role and Pin for completely new members
        if (!isExisting) {
          userData.Role = "Member";
          userData.Pin = "1234";
          userData.status = "active";
        }

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
  login: async (memberId, pin) => {
    try {
      // First check if it's the super admin
      if (memberId.toLowerCase().trim() === "admin@rotary.org") {
        if (String(pin).trim() === "0000") {
          return {
            success: true,
            member: { Name: "Super Admin", Email: "admin@rotary.org", "Member ID": "admin@rotary.org", isSuperAdmin: true, Role: "Super Admin" }
          };
        } else {
          return { success: false, error: "Incorrect PIN" };
        }
      }

      const q = query(collection(db, "users"), where("Member ID", "==", memberId.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, error: "Member ID not found" };
      }
      
      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      
      const savedPin = String(userData.Pin || userData["Password/PIN"] || "").trim();
      
      if (savedPin === "") {
        return { success: true, needsPinSetup: true, memberId: userData["Member ID"] };
      }
      
      if (savedPin === String(pin).trim()) {
        const { Pin, "Password/PIN": p, ...sanitized } = userData;
        return { success: true, member: { id: userDoc.id, ...sanitized } };
      }
      return { success: false, error: "Incorrect PIN" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Auth: Set initial PIN
  setPin: async (memberId, pin) => {
    try {
      const q = query(collection(db, "users"), where("Member ID", "==", memberId.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, error: "Member ID not found" };
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

      const { Pin: savedP, "Password/PIN": p, ...sanitized } = userData;
      return { success: true, member: { id: userDoc.id, ...sanitized, Pin: String(pin).trim() } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  changePin: async (memberId, oldPin, newPin) => {
    try {
      const q = query(collection(db, "users"), where("Member ID", "==", memberId.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, error: "Member ID not found" };
      }
      
      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      
      const savedPin = String(userData.Pin || userData["Password/PIN"] || "").trim();
      
      if (savedPin !== String(oldPin).trim()) {
        return { success: false, error: "Incorrect current PIN" };
      }
      
      await updateDoc(doc(db, "users", userDoc.id), { Pin: String(newPin).trim() });
      if (userData.chapterId) {
        await updateDoc(doc(db, "chapters", userData.chapterId, "members", userDoc.id), { Pin: String(newPin).trim() });
      }

      const { Pin: savedP, "Password/PIN": p, ...sanitized } = userData;
      return { success: true, member: { id: userDoc.id, ...sanitized, Pin: String(newPin).trim() } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Feedback
  acknowledgeFeedback: async (chapterId, feedbackId) => {
    try {
      const fbRef = doc(db, "chapters", chapterId, "feedbacks", feedbackId);
      await updateDoc(fbRef, { acknowledged: true });
      return { success: true };
    } catch (err) {
      console.error("Error acknowledging feedback:", err);
      return { success: false, error: err.toString() };
    }
  },

  // Mark Attendance
  markAttendance: async (eventId, eventName, attendanceList, dateStr) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      for (const item of attendanceList) {
        const docId = `${eventId}_${item.memberId}`;
        const attRef = doc(db, "chapters", activeChapterId, "attendance", docId);
        await setDoc(attRef, {
          "Attendance ID": docId,
          "Event ID": eventId,
          "Event Name": eventName,
          "Member ID": item.memberId,
          "Member Name": item.memberName,
          "Status": item.status,
          "Date": dateStr
        }, { merge: true });
        await api.logActivity(activeChapterId, item.memberId, "Marked Attendance", `Marked as ${item.status} for ${eventName}`);
      }
      return { success: true };
    } catch (err) {
      console.error("Error saving attendance:", err);
      return { success: false, error: err.toString() };
    }
  },

  // Create Event
  addEvent: async (event) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const nextId = "E" + Date.now().toString().slice(-6);
      const newEvent = {
        "Event ID": nextId,
        "Event Name": event.eventName,
        "Date": event.date,
        "Time": event.time,
        "Venue": event.venue,
        "Type": event.type,
        "Description": event.description
      };
      await setDoc(doc(db, "chapters", activeChapterId, "events", nextId), newEvent);
      return { success: true, id: nextId };
    } catch (err) {
      console.error("Error creating event:", err);
      return { success: false, error: err.toString() };
    }
  },

  createEvent: async (chapterId, eventData) => {
    try {
      const id = "EVT_" + Date.now();
      const newEvent = {
        ...eventData,
        "Event ID": id,
        id
      };
      await setDoc(doc(db, "chapters", chapterId, "events", id), newEvent);
      return { success: true, id };
    } catch (err) {
      console.error("Error creating event:", err);
      return { success: false, error: err.toString() };
    }
  },

  updateEvent: async (chapterId, eventId, eventData) => {
    try {
      await updateDoc(doc(db, "chapters", chapterId, "events", eventId), eventData);
      return { success: true };
    } catch (err) {
      console.error("Error updating event:", err);
      return { success: false, error: err.toString() };
    }
  },

  deleteEvent: async (chapterId, eventId) => {
    try {
      await deleteDoc(doc(db, "chapters", chapterId, "events", eventId));
      return { success: true };
    } catch (err) {
      console.error("Error deleting event:", err);
      return { success: false, error: err.toString() };
    }
  },

  // Create Announcement
  addAnnouncement: async (announcement) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const id = "ANN_" + Date.now();
      const newAnn = {
        ...announcement,
        "Announcement ID": id,
        id,
        "Date": new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, "chapters", activeChapterId, "announcements", id), newAnn);
      return { success: true, id };
    } catch (err) {
      console.error("Error adding announcement:", err);
      return { success: false, error: err.toString() };
    }
  },

  publishWhatsNew: async (title, content) => {
    try {
      const id = "WN_" + Date.now();
      await setDoc(doc(db, "global_notifications", id), {
        id,
        title,
        content,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (err) {
      console.error("Error publishing whats new:", err);
      return { success: false, error: err.toString() };
    }
  },

  getWhatsNew: async () => {
    try {
      const q = query(collection(db, "global_notifications"), orderBy("timestamp", "desc"), limit(5));
      const snap = await getDocs(q);
      const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, notifications };
    } catch (err) {
      console.error("Error fetching whats new:", err);
      return { success: false, error: err.toString() };
    }
  },

  subscribeToWhatsNew: (callback) => {
    const q = query(collection(db, "global_notifications"), orderBy("timestamp", "desc"), limit(5));
    return onSnapshot(q, (snap) => {
      const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notifications);
    }, (error) => {
      console.error("Error subscribing to whats new:", error);
    });
  },

  createCharityDonation: async (chapterId, memberId, memberName, amount, description) => {
    try {
      const paymentId = "PAY_" + Date.now();
      const newPayment = {
        "Payment ID": paymentId,
        id: paymentId,
        "Member ID": memberId,
        "Member Name": memberName,
        "Amount": Number(amount),
        "Description": description || "Charity Donation",
        "Due Date": new Date().toISOString().split('T')[0],
        "Status": "Pending", // Needs payment & PST approval
        "Category": "Charity / Additional Donations",
        "Created At": new Date().toISOString()
      };
      await setDoc(doc(db, "chapters", chapterId, "payments", paymentId), newPayment);
      return { success: true, paymentId };
    } catch (err) {
      console.error("Error creating charity donation:", err);
      return { success: false, error: err.toString() };
    }
  },

  createReceivables: async (membersToCharge, category, amount, description, dueDate, eventId) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const batchOp = writeBatch(db);
      
      membersToCharge.forEach(member => {
        const paymentId = `P${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const pRef = doc(db, "chapters", activeChapterId, "payments", paymentId);
        batchOp.set(pRef, {
          "Payment ID": paymentId,
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
        });
      });

      await batchOp.commit();
      return { success: true };
    } catch (err) {
      console.error("Error creating receivables:", err);
      return { success: false, error: err.toString() };
    }
  },

  // Make Payment
  proposePaymentEdit: async (paymentId, changes, original, currentUser, members) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const editId = `EDIT-${Date.now()}`;
      
      const configRes = await api.getGlobalConfig();
      const coreRoles = (configRes.success && configRes.config && configRes.config.coreCommitteeRoles) ? configRes.config.coreCommitteeRoles : ['President', 'Secretary', 'Treasurer'];

      const currentUserId = String(currentUser["Member ID"] || currentUser.id).trim();
      const targetUserId = original ? String(original["Member ID"]).trim() : null;
      let requiredApprovers = members
        .filter(m => {
          const mId = String(m["Member ID"] || m.id).trim();
          return coreRoles.includes(m.Role) && mId !== currentUserId && mId !== targetUserId;
        })
        .map(m => String(m["Member ID"] || m.id).trim());

      const payload = {
        "Payment ID": paymentId,
        "Type": "Edit",
        "Changes": changes,
        "Original": original,
        "Initiator ID": currentUserId,
        "Initiator Name": currentUser["Name"] || currentUser.name || "Committee Member",
        "Status": "pending",
        "Required Approvers": requiredApprovers,
        "Approvals": [],
        "timestamp": new Date().toISOString()
      };

      await setDoc(doc(db, "chapters", activeChapterId, "payment_edits", editId), payload);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  proposePaymentWaiver: async (paymentId, amount, currentUser, members, targetMemberId) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const editId = `EDIT-${Date.now()}`;
      
      const configRes = await api.getGlobalConfig();
      const coreRoles = (configRes.success && configRes.config && configRes.config.coreCommitteeRoles) ? configRes.config.coreCommitteeRoles : ['President', 'Secretary', 'Treasurer'];

      const currentUserId = String(currentUser["Member ID"] || currentUser.id).trim();
      const targetUserId = targetMemberId ? String(targetMemberId).trim() : null;
      let requiredApprovers = members
        .filter(m => {
          const mId = String(m["Member ID"] || m.id).trim();
          return coreRoles.includes(m.Role) && mId !== currentUserId && mId !== targetUserId;
        })
        .map(m => String(m["Member ID"] || m.id).trim());

      const payload = {
        "Payment ID": paymentId,
        "Type": "Waiver",
        "Amount": amount,
        "Initiator ID": currentUserId,
        "Initiator Name": currentUser["Name"] || currentUser.name || "Committee Member",
        "Status": "pending",
        "Required Approvers": requiredApprovers,
        "Approvals": [],
        "timestamp": new Date().toISOString()
      };

      await setDoc(doc(db, "chapters", activeChapterId, "payment_edits", editId), payload);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approvePaymentEdit: async (editId, currentUser) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const editRef = doc(db, "chapters", activeChapterId, "payment_edits", editId);
      const editSnap = await getDoc(editRef);
      if (!editSnap.exists()) throw new Error("Edit not found");
      const editData = editSnap.data();

      const currentUserId = String(currentUser["Member ID"] || currentUser.id).trim();
      let approvals = editData["Approvals"] || [];
      if (!approvals.includes(currentUserId)) {
        approvals.push(currentUserId);
      }

      const required = editData["Required Approvers"] || [];
      const hasAllApprovals = required.every(reqId => approvals.includes(reqId));

      if (hasAllApprovals) {
        const paymentRef = doc(db, "chapters", activeChapterId, "payments", editData["Payment ID"]);
        
        if (editData["Type"] === "Waiver") {
          await updateDoc(paymentRef, { "Status": "Waived", "Amount": 0 });
        } else if (editData["Type"] === "Edit") {
          await updateDoc(paymentRef, editData["Changes"]);
        }

        await updateDoc(editRef, { "Status": "approved", "Approvals": approvals });
        return { success: true, applied: true };
      } else {
        await updateDoc(editRef, { "Approvals": approvals });
        return { success: true, applied: false };
      }
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectPaymentEdit: async (editId, currentUser) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const editRef = doc(db, "chapters", activeChapterId, "payment_edits", editId);
      await updateDoc(editRef, { "Status": "rejected", "Rejected By": currentUser["Name"] });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  cancelPaymentEdit: async (editId) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const editRef = doc(db, "chapters", activeChapterId, "payment_edits", editId);
      await updateDoc(editRef, { "Status": "cancelled" });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },
  submitPaymentReference: async (paymentId, reference) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const pRef = doc(db, "chapters", activeChapterId, "payments", paymentId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        await updateDoc(pRef, {
          "Status": "Verification Pending",
          "Reference": reference
        });
        const pData = pSnap.data();
        await api.logActivity(activeChapterId, pData["Member ID"], "Payment Reference Submitted", `You submitted reference ${reference} for ${pData["Category"] || pData["Description"] || "Dues"}.`);
      }
      return { success: true };
    } catch (err) {
      console.error("Error submitting payment reference:", err);
      return { success: false, error: err.toString() };
    }
  },

  verifyPayment: async (paymentId) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const pRef = doc(db, "chapters", activeChapterId, "payments", paymentId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const pData = pSnap.data();
        await updateDoc(pRef, {
          "Status": "Paid",
          "Paid Date": new Date().toISOString().split('T')[0]
        });
        await api.logActivity(activeChapterId, pData["Member ID"], "Payment Verified", `Payment of ₹${pData["Amount"]} for ${pData["Category"] || pData["Description"] || "Dues"} was verified.`);
      }
      return { success: true };
    } catch (err) {
      console.error("Error verifying payment:", err);
      return { success: false, error: err.toString() };
    }
  },

  rejectPaymentVerification: async (paymentId) => {
    if (!activeChapterId) return { success: false, error: "No active chapter" };
    try {
      const pRef = doc(db, "chapters", activeChapterId, "payments", paymentId);
      await updateDoc(pRef, {
        "Status": "Pending",
        "Reference": ""
      });
      return { success: true };
    } catch (err) {
      console.error("Error rejecting payment:", err);
      return { success: false, error: err.toString() };
    }
  },

  updateEventReminder: async (chapterId, eventId, scheduleReminderTime) => {
    try {
      if (!chapterId || !eventId) throw new Error("Missing params");
      const eventRef = doc(db, `chapters/${chapterId}/events`, eventId);
      await updateDoc(eventRef, { scheduleReminderTime });
      return { success: true };
    } catch (error) {
      console.error("Error updating event reminder:", error);
      return { success: false, error: error.message };
    }
  },

  createRazorpaySubscription: async (planId, chapterId, memberId) => {
    try {
      const createSub = httpsCallable(functions, 'createRazorpaySubscription');
      const result = await createSub({ planId, chapterId, memberId });
      return { success: true, data: result.data };
    } catch (error) {
      console.error("Error creating Razorpay subscription:", error);
      return { success: false, error: error.message };
    }
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
  },

  getGlobalConfig: async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) {
        return { success: true, config: docSnap.data() };
      }
      return { success: true, config: {} };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getChapterData: async (chapterId) => {
    try {
      const docSnap = await getDoc(doc(db, "chapters", chapterId));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, error: "Not found" };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  updateChapterSettings: async (chapterId, settings) => {
    try {
      await updateDoc(doc(db, "chapters", chapterId), settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  assignDesignations: async (chapterId, memberId, designations) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "chapters", chapterId, "members", memberId), { Designations: designations });
      batch.update(doc(db, "users", memberId), { Designations: designations });
      await batch.commit();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getActiveDevCodes: async () => {
    try {
      const snap = await getDocs(collection(db, "devCodes"));
      const codes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, codes };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  createDevCode: async (code) => {
    try {
      await setDoc(doc(db, "devCodes", code), {
        code,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  deleteDevCode: async (code) => {
    try {
      await deleteDoc(doc(db, "devCodes", code));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  validateDevCode: async (code) => {
    try {
      const docSnap = await getDoc(doc(db, "devCodes", code));
      if (!docSnap.exists()) return { success: false, error: "Invalid dev code." };
      
      const data = docSnap.data();
      if (new Date(data.expiresAt) < new Date()) {
        return { success: false, error: "Dev code expired." };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getAllUsersForDev: async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, users };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getAllPlatformMembers: async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: users };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  updateFamilyMembers: async (chapterId, memberId, familyMembersArray) => {
    try {
      const userRef = doc(db, "users", memberId);
      const memberRef = doc(db, "chapters", chapterId, "members", memberId);
      
      await updateDoc(userRef, { FamilyMembers: familyMembersArray }).catch(e => console.warn("Failed to update users doc:", e));
      await updateDoc(memberRef, { FamilyMembers: familyMembersArray });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateUserProfile: async (chapterId, memberId, updateData) => {
    try {
      const userRef = doc(db, "users", memberId);
      const memberRef = doc(db, "chapters", chapterId, "members", memberId);
      
      await updateDoc(userRef, updateData).catch(e => console.warn("Failed to update users doc:", e));
      await updateDoc(memberRef, updateData);
      await api.logActivity(chapterId, memberId, "Profile Updated", "User profile information updated.");
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  uploadProfilePicture: async (memberId, file) => {
    try {
      if (!storage) throw new Error("Firebase Storage is not configured");
      const fileExt = file.name.split('.').pop();
      const fileName = `profiles/${memberId}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAvailableAvatars: async () => {
    try {
      const avatarsRef = collection(db, "avatars");
      const q = query(avatarsRef, where("taken", "==", false));
      const snapshot = await getDocs(q);
      const avatars = [];
      snapshot.forEach(doc => {
        avatars.push({ id: doc.id, ...doc.data() });
      });
      return avatars;
    } catch (error) {
      console.error("Failed to get avatars", error);
      return [];
    }
  },

  claimAvatar: async (avatarId, memberId) => {
    try {
      const avatarRef = doc(db, "avatars", avatarId);
      await updateDoc(avatarRef, { taken: true, takenBy: memberId, takenAt: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  generatePresetAvatars: async () => {
    try {
      const avatarsRef = collection(db, "avatars");
      const snapshot = await getDocs(query(avatarsRef));
      if (snapshot.size > 0) return; // already populated
      
      const batch = writeBatch(db);
      // Generate 50 unique dicebear avatars
      for (let i = 0; i < 50; i++) {
        const seed = `rotary_member_${i}_${Date.now()}`;
        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e2e8f0`;
        const newRef = doc(avatarsRef);
        batch.set(newRef, {
          url,
          taken: false,
          takenBy: null,
          createdAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log("Generated 50 unique avatars");
    } catch (error) {
      console.error("Failed to generate preset avatars", error);
    }
  },

  saveGlobalConfig: async (configData) => {
    try {
      await setDoc(doc(db, "settings", "global"), configData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  getPendingRelations: async (chapterId) => {
    try {
      const snap = await getDocs(collection(db, "chapters", chapterId, "members"));
      const pending = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.FamilyMembers && Array.isArray(data.FamilyMembers)) {
          data.FamilyMembers.forEach((fm, index) => {
            if (fm.status === 'pending') {
              pending.push({ memberId: docSnap.id, memberName: data.Name, relationIndex: index, ...fm });
            }
          });
        }
      });
      return { success: true, pending };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  approveRelation: async (chapterId, memberId, relationIndex) => {
    try {
      const docRef = doc(db, "chapters", chapterId, "members", memberId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const family = data.FamilyMembers || [];
        if (family[relationIndex]) {
          family[relationIndex].status = 'approved';
          const batch = writeBatch(db);
          batch.update(docRef, { FamilyMembers: family });
          batch.update(doc(db, "users", memberId), { FamilyMembers: family });
          await batch.commit();
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  rejectRelation: async (chapterId, memberId, relationIndex) => {
    try {
      const docRef = doc(db, "chapters", chapterId, "members", memberId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const family = data.FamilyMembers || [];
        if (family[relationIndex]) {
          family.splice(relationIndex, 1);
          const batch = writeBatch(db);
          batch.update(docRef, { FamilyMembers: family });
          batch.update(doc(db, "users", memberId), { FamilyMembers: family });
          await batch.commit();
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  submitFeedback: async (memberId, memberName, feedbackText, chapterId = "amity-tvm") => {
    try {
      const fbId = "fb_" + Date.now();
      const fbRef = doc(db, "chapters", chapterId, "feedbacks", fbId);
      await setDoc(fbRef, {
        memberId,
        memberName,
        feedback: feedbackText,
        status: "New",
        timestamp: new Date().toISOString()
      });
      await api.logActivity(chapterId, memberId, "Submitted Feedback", "You shared feedback with the chapter admins.");
      return { success: true };
    } catch (err) {
      console.error("Error submitting feedback:", err);
      return { success: false, error: err.toString() };
    }
  },

  saveFcmToken: async (memberId, token) => {
    try {
      if (!memberId) return { success: false, error: "No member ID" };
      const userRef = doc(db, "users", String(memberId));
      await updateDoc(userRef, { fcmToken: token });
      return { success: true };
    } catch (err) {
      console.error("saveFcmToken error:", err);
      return { success: false, error: err.message };
    }
  },

  getClubDetails: async (chapterId) => {
    try {
      const snap = await getDoc(doc(db, "chapters", chapterId));
      if (!snap.exists()) return { success: true, data: {} };
      const data = snap.data();
      return { success: true, data: data.clubDetails || {} };
    } catch (err) {
      console.error("getClubDetails error:", err);
      return { success: false, error: err.message };
    }
  },

  requestClubDetailsEdit: async (chapterId, newData, currentUser, requiredApprovers) => {
    try {
      const editRef = collection(db, "chapters", chapterId, "club_details_edits");
      await addDoc(editRef, {
        "Status": "pending",
        "Proposed By": currentUser["Member ID"],
        "Proposed By Name": currentUser["Name"],
        "Timestamp": new Date().toISOString(),
        "Required Approvers": requiredApprovers,
        "Approvals": [],
        "Data": newData
      });
      return { success: true };
    } catch (err) {
      console.error("requestClubDetailsEdit error:", err);
      return { success: false, error: err.message };
    }
  },

  approveClubDetailsEdit: async (chapterId, editId, currentUser) => {
    try {
      const editRef = doc(db, "chapters", chapterId, "club_details_edits", editId);
      const snap = await getDoc(editRef);
      if (!snap.exists()) return { success: false, error: "Request not found" };
      
      const editData = snap.data();
      let approvals = editData["Approvals"] || [];
      if (!approvals.includes(currentUser["Member ID"])) {
        approvals.push(currentUser["Member ID"]);
      }
      
      const required = editData["Required Approvers"] || [];
      const isApproved = approvals.length >= (required.length || 1);
      
      if (isApproved) {
        await updateDoc(editRef, { "Status": "approved", "Approvals": approvals });
        const chapterRef = doc(db, "chapters", chapterId);
        await updateDoc(chapterRef, { clubDetails: editData["Data"] });
      } else {
        await updateDoc(editRef, { "Approvals": approvals });
      }
      return { success: true, isApproved };
    } catch (err) {
      console.error("approveClubDetailsEdit error:", err);
      return { success: false, error: err.message };
    }
  },

  rejectClubDetailsEdit: async (chapterId, editId) => {
    try {
      const editRef = doc(db, "chapters", chapterId, "club_details_edits", editId);
      await updateDoc(editRef, { "Status": "rejected" });
      return { success: true };
    } catch (err) {
      console.error("rejectClubDetailsEdit error:", err);
      return { success: false, error: err.message };
    }
  },

  getPendingClubDetailsEdits: async (chapterId) => {
    try {
      const q = query(collection(db, "chapters", chapterId, "club_details_edits"), where("Status", "==", "pending"));
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      return { success: true, data: results };
    } catch (err) {
      console.error("getPendingClubDetailsEdits error:", err);
      return { success: false, error: err.message };
    }
  },

  getApprovedClubDetailsEdits: async (chapterId) => {
    try {
      const q = query(collection(db, "chapters", chapterId, "club_details_edits"), where("Status", "==", "approved"));
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      // Sort in memory by Timestamp desc to avoid requiring a composite index
      results.sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));
      return { success: true, data: results };
    } catch (err) {
      console.error("getApprovedClubDetailsEdits error:", err);
      return { success: false, error: err.message };
    }
  },

  // Awards Management API

  createAwardCriteria: async (chapterId, criteriaData) => {
    try {
      const criteriaRef = collection(db, "chapters", chapterId, "award_criteria");
      const docRef = await addDoc(criteriaRef, criteriaData);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error("createAwardCriteria error:", err);
      return { success: false, error: err.message };
    }
  },

  getAwardCriteria: async (chapterId) => {
    try {
      const q = query(collection(db, "chapters", chapterId, "award_criteria"));
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      return { success: true, data: results };
    } catch (err) {
      console.error("getAwardCriteria error:", err);
      return { success: false, error: err.message };
    }
  },

  deleteAwardCriteria: async (chapterId, criteriaId) => {
    try {
      const criteriaRef = doc(db, "chapters", chapterId, "award_criteria", criteriaId);
      await deleteDoc(criteriaRef);
      return { success: true };
    } catch (err) {
      console.error("deleteAwardCriteria error:", err);
      return { success: false, error: err.message };
    }
  },

  assignBadgesToMembers: async (memberIds, badgeDefinition, awardedBy) => {
    try {
      const badgeData = {
        ...badgeDefinition,
        awardedBy,
        date: new Date().toISOString()
      };
      
      const promises = memberIds.map(async (memberId) => {
        const memberRef = doc(db, "users", String(memberId));
        const snap = await getDoc(memberRef);
        if (snap.exists()) {
          const existingBadges = snap.data().badges || [];
          // Avoid duplicate badge types if necessary, though here we'll just append
          if (!existingBadges.some(b => b.id === badgeDefinition.id)) {
            existingBadges.push(badgeData);
            await updateDoc(memberRef, { badges: existingBadges });
          }
        }
      });
      await Promise.all(promises);
      return { success: true };
    } catch (err) {
      console.error("assignBadgesToMembers error:", err);
      return { success: false, error: err.message };
    }
  },

  proposeAward: async (chapterId, criteria, memberIds, badgeDefinition, initiator) => {
    try {
      // Find all PST members to create the initial approval state
      const membersSnap = await getDocs(collection(db, "chapters", chapterId, "members"));
      const pstRoles = ["President", "Secretary", "Treasurer"];
      const pstMembers = membersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => pstRoles.includes(m.Role));

      const approvals = {};
      pstMembers.forEach(m => {
        // If the PST member is the initiator, they auto-approve
        if (m.Role === initiator.Role) {
          approvals[m.Role] = { status: "approved", by: initiator.Name, at: new Date().toISOString() };
        } else {
          approvals[m.Role] = { status: "pending", by: m.Name, id: m["Member ID"] || m.id };
        }
      });

      const docData = {
        criteriaId: criteria.id,
        criteriaName: criteria.name,
        badgeDefinition,
        memberIds,
        initiator: { name: initiator.Name, role: initiator.Role },
        approvals,
        status: "pending", // pending, completed, rejected
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "chapters", chapterId, "award_approvals"), docData);
      return { success: true };
    } catch (err) {
      console.error("proposeAward error:", err);
      return { success: false, error: err.message };
    }
  },

  getAwardApprovals: async (chapterId) => {
    try {
      const snap = await getDocs(collection(db, "chapters", chapterId, "award_approvals"));
      const approvals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by newest first
      approvals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: approvals };
    } catch (err) {
      console.error("getAwardApprovals error:", err);
      return { success: false, error: err.message };
    }
  },

  approveAward: async (chapterId, approvalId, approverRole, approverName) => {
    try {
      const ref = doc(db, "chapters", chapterId, "award_approvals", approvalId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Approval not found");
      
      const data = snap.data();
      const approvals = { ...data.approvals };
      
      if (approvals[approverRole]) {
        approvals[approverRole] = {
          ...approvals[approverRole],
          status: "approved",
          by: approverName,
          at: new Date().toISOString()
        };
      } else {
        // Fallback if role wasn't mapped initially
        approvals[approverRole] = { status: "approved", by: approverName, at: new Date().toISOString() };
      }

      // Check if all PST roles have approved
      const pstRoles = ["President", "Secretary", "Treasurer"];
      const allApproved = pstRoles.every(role => {
        return !approvals[role] || approvals[role].status === "approved";
      });

      const updates = { approvals };
      
      if (allApproved) {
        updates.status = "completed";
      }
      
      await updateDoc(ref, updates);
      
      // If completed, automatically assign the badges!
      if (allApproved) {
        await api.assignBadgesToMembers(data.memberIds, data.badgeDefinition, "PST Team");
      }
      
      return { success: true, completed: allApproved };
    } catch (err) {
      console.error("approveAward error:", err);
      return { success: false, error: err.message };
    }
  },

  rejectAward: async (chapterId, approvalId, approverRole, approverName) => {
    try {
      const ref = doc(db, "chapters", chapterId, "award_approvals", approvalId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Approval not found");

      const data = snap.data();
      const approvals = { ...data.approvals };

      if (approvals[approverRole]) {
        approvals[approverRole] = {
          ...approvals[approverRole],
          status: "rejected",
          by: approverName,
          at: new Date().toISOString()
        };
      }

      await updateDoc(ref, { approvals, status: "rejected" });
      return { success: true };
    } catch (err) {
      console.error("rejectAward error:", err);
      return { success: false, error: err.message };
    }
  }
};

