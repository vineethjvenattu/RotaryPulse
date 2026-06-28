const fs = require('fs');
let content = fs.readFileSync('src/services/api.js', 'utf8');

// Insert submitFeedback method inside api object
const feedbackMethod = `
  submitFeedback: async (memberId, memberName, text, chapterId) => {
    try {
      // 1. Save feedback to feedbacks collection
      const feedbackData = {
        memberId,
        memberName,
        text,
        chapterId,
        timestamp: new Date().toISOString(),
        status: 'open'
      };
      const feedbackRef = await addDoc(collection(db, "feedbacks"), feedbackData);
      
      // 2. Notify Admins
      const q = query(collection(db, "users"), where("Role", "==", "Admin"));
      const snap = await getDocs(q);
      const adminIds = snap.docs.map(doc => doc.id);
      
      // Also notify Super Admin just in case
      const superQ = query(collection(db, "users"), where("isSuperAdmin", "==", true));
      const superSnap = await getDocs(superQ);
      superSnap.docs.forEach(doc => {
        if (!adminIds.includes(doc.id)) adminIds.push(doc.id);
      });
      
      // Create notification for each admin
      for (const adminId of adminIds) {
        await addDoc(collection(db, "users", adminId, "notifications"), {
          title: "New Feedback Submitted",
          body: \`\${memberName} submitted feedback/issue.\`,
          feedbackId: feedbackRef.id,
          timestamp: new Date().toISOString(),
          read: false
        });
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },
`;

// Insert after markAttendance method end (to keep it organized)
content = content.replace(
  /markAttendance: async \([\s\S]*?\} catch \(e\) \{\s*console.error\("Error saving attendance", e\);\s*return \{ success: false, error: e\.message \};\s*\}\s*\},/,
  "$&" + feedbackMethod
);

fs.writeFileSync('src/services/api.js', content);
