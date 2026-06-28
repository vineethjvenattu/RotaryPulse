const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// 1. Add state for Classification and PIN
const newStates = `
  const [classification, setClassification] = useState(currentUser.Classification || '');
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  const availableClassifications = useMemo(() => {
    const classList = allPlatformMembers
      .map(m => m.Classification)
      .filter(c => c && typeof c === 'string' && c.trim() !== '');
    return Array.from(new Set(classList)).sort();
  }, [allPlatformMembers]);
`;

// Insert the new states right after `const [email, setEmail] = useState...`
content = content.replace(
  "const [email, setEmail] = useState(currentUser.Email || '');",
  "const [email, setEmail] = useState(currentUser.Email || '');" + newStates
);

// 2. Add handleClassificationChange to ensure capitalization
const classificationHandler = `
  const handleClassificationChange = (e) => {
    const val = e.target.value;
    if (val) {
      setClassification(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
    } else {
      setClassification('');
    }
  };
`;
// Insert before handleSaveProfile
content = content.replace("const handleSaveProfile = async () => {", classificationHandler + "\n  const handleSaveProfile = async () => {");

// 3. Update updateData to include Classification
content = content.replace(
  "Email: email",
  "Email: email,\n        Classification: classification"
);

// 4. Add changePinHandler
const changePinHandler = `
  const handleChangePin = async () => {
    setPinError('');
    setPinSuccess('');
    if (!oldPin || !newPin || !confirmNewPin) {
      setPinError("All fields are required.");
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError("New PIN and Confirm PIN do not match.");
      return;
    }
    setChangingPin(true);
    const res = await api.changePin(currentUser["Member ID"], oldPin, newPin);
    if (res.success) {
      setPinSuccess("PIN changed successfully!");
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      setPinError(res.error || "Failed to change PIN.");
    }
    setChangingPin(false);
  };
`;

content = content.replace("const handleClassificationChange = (e) => {", changePinHandler + "\n  const handleClassificationChange = (e) => {");

// 5. Add Classification Field to the form (after Email)
const classificationUI = `
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Classification</label>
                  <input
                    list="classifications-list"
                    type="text"
                    value={classification}
                    onChange={handleClassificationChange}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd' }}
                    placeholder="e.g. Doctor, Engineer..."
                  />
                  <datalist id="classifications-list">
                    {availableClassifications.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
`;
content = content.replace(
  /<input[\s\S]*?value=\{email\}[\s\S]*?\/>\s*<\/div>/,
  "$&" + classificationUI
);

// 6. Add Change PIN UI inside the Modal (Before Save button)
const changePinUI = `
                {/* Change PIN Section */}
                <div style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Change PIN</h4>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowChangePin(!showChangePin)}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      {showChangePin ? 'Hide' : 'Change PIN'}
                    </button>
                  </div>
                  
                  {showChangePin && (
                    <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Current PIN</label>
                        <input
                          type="password"
                          value={oldPin}
                          onChange={(e) => setOldPin(e.target.value)}
                          className="form-control"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd' }}
                          placeholder="Enter current PIN"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>New PIN</label>
                          <input
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd' }}
                            placeholder="Enter new PIN"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Confirm New PIN</label>
                          <input
                            type="password"
                            value={confirmNewPin}
                            onChange={(e) => setConfirmNewPin(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd' }}
                            placeholder="Confirm new PIN"
                          />
                        </div>
                      </div>
                      
                      {pinError && <div style={{ color: '#d32f2f', fontSize: '13px', marginBottom: '12px' }}>{pinError}</div>}
                      {pinSuccess && <div style={{ color: '#2e7d32', fontSize: '13px', marginBottom: '12px' }}>{pinSuccess}</div>}
                      
                      <button 
                        className="btn btn-primary" 
                        onClick={handleChangePin}
                        disabled={changingPin}
                        style={{ width: '100%' }}
                      >
                        {changingPin ? 'Updating...' : 'Update PIN'}
                      </button>
                    </div>
                  )}
                </div>
`;
content = content.replace(
  /<div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>\s*<button className="btn btn-secondary"/,
  changePinUI + "\n                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>\n                  <button className=\"btn btn-secondary\""
);

fs.writeFileSync('src/pages/Profile.jsx', content);
