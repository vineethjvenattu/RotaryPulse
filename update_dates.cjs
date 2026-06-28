const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

const helpers = `
  const formatDateDisplay = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      let year = d.getFullYear();
      if (year < 100) year += 2000;
      return \`\${day}-\${month}-\${year}\`;
    }
    return val;
  };

  const toDateInputValue = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      let year = d.getFullYear();
      if (year < 100) year += 2000;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return \`\${year}-\${month}-\${day}\`;
    }
    return '';
  };
`;
content = content.replace("  // Edit Profile State", helpers + "\n  // Edit Profile State");

// Use toDateInputValue for editProfileForm initialization
content = content.replace(
  `setEditProfileForm({
                Mobile: currentUser["Mobile"] || '',
                "Blood Group": currentUser["Blood Group"] || '',
                Birthday: currentUser["Birthday"] || '',
                Anniversary: currentUser["Anniversary"] || ''
              });`,
  `setEditProfileForm({
                Mobile: currentUser["Mobile"] || '',
                "Blood Group": currentUser["Blood Group"] || '',
                Birthday: toDateInputValue(currentUser["Birthday"]),
                Anniversary: toDateInputValue(currentUser["Anniversary"])
              });`
);

// Format Birthday display
const oldBirthdayDisplay = `{(() => {
                  const val = currentUser["Birthday"];
                  if (!val) return "Not Specified";
                  const d = new Date(val);
                  if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = d.toLocaleString('en-US', { month: 'short' });
                    let year = d.getFullYear();
                    if (year < 100) year += 2000;
                    return \`\${day}-\${month}-\${year}\`;
                  }
                  return val;
                })()}`;
content = content.replace(oldBirthdayDisplay, `{formatDateDisplay(currentUser["Birthday"]) || "Not Specified"}`);

// Format Anniversary display
content = content.replace(`{currentUser["Anniversary"] || "Single / Not Specified"}`, `{formatDateDisplay(currentUser["Anniversary"]) || "Single / Not Specified"}`);

// Change inputs to type date
content = content.replace(
  `<input type="text" className="form-input" value={editProfileForm.Birthday} onChange={e => setEditProfileForm({...editProfileForm, Birthday: e.target.value})} placeholder="e.g. 1980-01-01" />`,
  `<input type="date" className="form-input" value={editProfileForm.Birthday} onChange={e => setEditProfileForm({...editProfileForm, Birthday: e.target.value})} />`
);
content = content.replace(
  `<input type="text" className="form-input" value={editProfileForm.Anniversary} onChange={e => setEditProfileForm({...editProfileForm, Anniversary: e.target.value})} placeholder="e.g. 2005-05-15" />`,
  `<input type="date" className="form-input" value={editProfileForm.Anniversary} onChange={e => setEditProfileForm({...editProfileForm, Anniversary: e.target.value})} />`
);

// Format Join Date
content = content.replace(`{currentUser["Join Date"]}`, `{formatDateDisplay(currentUser["Join Date"])}`);

fs.writeFileSync('src/pages/Profile.jsx', content);
