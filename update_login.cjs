const fs = require('fs');

// 1. Update api.js
let apiContent = fs.readFileSync('src/services/api.js', 'utf8');
apiContent = apiContent.replace(
  /login: async \(email, pin\) => \{[\s\S]*?return \{ success: false, error: e\.message \};\n    \}\n  \},/,
  `login: async (memberId, pin) => {
    try {
      if (memberId.toLowerCase().trim() === "admin@rotary.org") {
        if (String(pin).trim() === "0000") {
          return { success: true, member: { Name: "Super Admin", Email: "admin@rotary.org", "Member ID": "admin@rotary.org", isSuperAdmin: true, Role: "Super Admin" } };
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
        return { success: true, member: userData };
      }
      return { success: false, error: "Incorrect PIN" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },`
);
apiContent = apiContent.replace(
  /setPin: async \(email, pin\) => \{[\s\S]*?return \{ success: false, error: e\.message \};\n    \}\n  \},/,
  `setPin: async (memberId, pin) => {
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
      return { success: true, member: { ...userData, Pin: String(pin).trim() } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },`
);
fs.writeFileSync('src/services/api.js', apiContent);

// 2. Update AuthContext.jsx
let authContent = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');
authContent = authContent.replace(/login = async \(email, pin\)/g, 'login = async (memberId, pin)');
authContent = authContent.replace(/api\.login\(email, pin\)/g, 'api.login(memberId, pin)');
authContent = authContent.replace(/setupPin = async \(email, pin\)/g, 'setupPin = async (memberId, pin)');
authContent = authContent.replace(/api\.setPin\(email, pin\)/g, 'api.setPin(memberId, pin)');
fs.writeFileSync('src/context/AuthContext.jsx', authContent);

// 3. Update Login.jsx
let loginContent = fs.readFileSync('src/pages/Login.jsx', 'utf8');
loginContent = loginContent.replace(/const \[email, setEmail\]/g, 'const [memberId, setMemberId]');
loginContent = loginContent.replace(/activeView === 'email'/g, 'activeView === \'memberId\'');
loginContent = loginContent.replace(/setActiveView\('email'\)/g, 'setActiveView(\'memberId\')');
loginContent = loginContent.replace(/handleQuickLogin = async \(emailVal, pinVal\)/g, 'handleQuickLogin = async (memberIdVal, pinVal)');
loginContent = loginContent.replace(/await login\(emailVal, pinVal\)/g, 'await login(memberIdVal, pinVal)');
loginContent = loginContent.replace(/setEmail\(emailVal\)/g, 'setMemberId(memberIdVal)');
loginContent = loginContent.replace(/setEmail\(selectedUser.Email\)/g, 'setMemberId(selectedUser["Member ID"])');
loginContent = loginContent.replace(/setEmail\(''\)/g, 'setMemberId(\'\')');
loginContent = loginContent.replace(/if \(!email \|\| !pin\)/g, 'if (!memberId || !pin)');
loginContent = loginContent.replace(/await login\(email, pin\)/g, 'await login(memberId, pin)');
loginContent = loginContent.replace(/await setupPin\(email, newPin\)/g, 'await setupPin(memberId, newPin)');
loginContent = loginContent.replace(/Email Address/g, 'Member ID');
loginContent = loginContent.replace(/Login with Email/g, 'Login with Member ID');
loginContent = loginContent.replace(/type="email"/g, 'type="text"');
loginContent = loginContent.replace(/id="email"/g, 'id="memberId"');
loginContent = loginContent.replace(/value=\{email\}/g, 'value={memberId}');
loginContent = loginContent.replace(/setEmail\(e.target.value\)/g, 'setMemberId(e.target.value)');
loginContent = loginContent.replace(/value=\{u\.Email\}/g, 'value={u["Member ID"]}');
loginContent = loginContent.replace(/find\(u => u\.Email === e\.target\.value\)/g, 'find(u => u["Member ID"] === e.target.value)');
fs.writeFileSync('src/pages/Login.jsx', loginContent);

// 4. Update InductLanding.jsx
let inductContent = fs.readFileSync('src/pages/InductLanding.jsx', 'utf8');
inductContent = inductContent.replace(/const \[email, setEmail\]/g, 'const [memberId, setMemberId]');
inductContent = inductContent.replace(/login\(email, pin\)/g, 'login(memberId, pin)');
inductContent = inductContent.replace(/placeholder="Email Address"/g, 'placeholder="Member ID"');
inductContent = inductContent.replace(/value=\{email\}/g, 'value={memberId}');
inductContent = inductContent.replace(/setEmail\(e\.target\.value\)/g, 'setMemberId(e.target.value)');
inductContent = inductContent.replace(/type="email"/g, 'type="text"');
fs.writeFileSync('src/pages/InductLanding.jsx', inductContent);

