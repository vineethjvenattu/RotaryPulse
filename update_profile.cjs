const fs = require('fs');

let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// 1. Add Camera to lucide-react imports
content = content.replace("Activity, X } from 'lucide-react';", "Activity, X, Camera, Edit2 } from 'lucide-react';");

// 2. Add new states inside Profile component
const stateInjectionPoint = "  // Family Members State";
const newStates = `  // Edit Profile State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ Mobile: '', "Blood Group": '', Birthday: '', Anniversary: '' });
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

`;
content = content.replace(stateInjectionPoint, newStates + stateInjectionPoint);

// 3. Add useEffect for Edit Profile Modal
const useEffectInjection = `
  useEffect(() => {
    if (showEditProfileModal) {
      document.body.style.overflow = 'hidden';
      api.getAvailableAvatars().then(async (avatars) => {
        if (avatars.length === 0) {
          await api.generatePresetAvatars();
          const newAvatars = await api.getAvailableAvatars();
          setAvailableAvatars(newAvatars);
        } else {
          setAvailableAvatars(avatars);
        }
      });
    } else if (!showFamilyModal) {
      document.body.style.overflow = '';
    }
  }, [showEditProfileModal]);
`;
content = content.replace("  useEffect(() => {", useEffectInjection + "\n  useEffect(() => {");

// 4. Add Profile Edit Handlers
const handlersInjection = `
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const updateData = {
      Mobile: editProfileForm.Mobile,
      "Blood Group": editProfileForm["Blood Group"],
      Birthday: editProfileForm.Birthday,
      Anniversary: editProfileForm.Anniversary
    };
    const res = await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
    setSavingProfile(false);
    if (res.success) {
      const updatedUser = { ...currentUser, ...updateData };
      sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      setShowEditProfileModal(false);
      window.location.reload();
    } else {
      alert("Error saving profile: " + res.error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const res = await api.uploadProfilePicture(currentUser["Member ID"], file);
    if (res.success) {
      const updateData = { avatarUrl: res.url };
      await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
      const updatedUser = { ...currentUser, ...updateData };
      sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      window.location.reload();
    } else {
      alert("Error uploading image: " + res.error);
      setUploadingImage(false);
    }
  };

  const handleSelectAvatar = async (avatarId, url) => {
    if (!window.confirm("Set this as your profile picture?")) return;
    const claimRes = await api.claimAvatar(avatarId, currentUser["Member ID"]);
    if (claimRes.success) {
      const updateData = { avatarUrl: url };
      await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
      const updatedUser = { ...currentUser, ...updateData };
      sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      window.location.reload();
    } else {
      alert("Error claiming avatar: " + claimRes.error);
    }
  };
`;
content = content.replace("  const handleSeedDatabase = async () => {", handlersInjection + "\n  const handleSeedDatabase = async () => {");

// 5. Add Edit Profile Button and Modal to JSX
// We replace the User Card rendering
const oldUserCard = `<div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px' }}>
          <Avatar member={currentUser} size={100} style={{ border: '3px solid var(--rotary-gold)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', marginTop: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{currentUser["Name"]}</h2>
          <div className="member-role-badge" style={{ fontSize: '12px', padding: '4px 12px', marginTop: '6px' }}>
            {currentUser["Role"]}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '14px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} />
              <span>{currentUser["Mobile"]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} />
              <span style={{ wordBreak: 'break-all' }}>{currentUser["Email"]}</span>
            </div>
          </div>
        </div>`;

const newUserCard = `<div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px', position: 'relative' }}>
          <button 
            onClick={() => {
              setEditProfileForm({
                Mobile: currentUser["Mobile"] || '',
                "Blood Group": currentUser["Blood Group"] || '',
                Birthday: currentUser["Birthday"] || '',
                Anniversary: currentUser["Anniversary"] || ''
              });
              setShowEditProfileModal(true);
            }}
            style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Edit Profile"
          >
            <Edit2 size={16} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <Avatar member={currentUser} size={100} style={{ border: '3px solid var(--rotary-gold)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', marginTop: '16px' }} />
          </div>
          
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{currentUser["Name"]}</h2>
          <div className="member-role-badge" style={{ fontSize: '12px', padding: '4px 12px', marginTop: '6px' }}>
            {currentUser["Role"]}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '14px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} />
              <span>{currentUser["Mobile"]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} />
              <span style={{ wordBreak: 'break-all' }}>{currentUser["Email"]}</span>
            </div>
          </div>
        </div>`;

content = content.replace(oldUserCard, newUserCard);

// 6. Add the Edit Profile Modal at the bottom
const editModalJSX = `

      {/* Edit Profile Modal */}
      {showEditProfileModal && createPortal(
        <div style={{ zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowEditProfileModal(false)}>
          <div className="animate-slide-up" style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: '24px', 
            borderTopRightRadius: '24px', 
            width: '100%', 
            maxWidth: '500px', 
            margin: 'auto auto 0 auto',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
            position: 'relative',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ backgroundColor: 'var(--rotary-blue)', padding: '24px', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '48px', height: '5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '10px', margin: '0 auto 16px' }}></div>
              <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }} onClick={() => setShowEditProfileModal(false)}><X size={20} /></button>
              <h2 style={{ marginBottom: '4px', fontSize: '22px', fontWeight: 700, color: 'white' }}>Edit Profile</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Update your personal details and avatar.</p>
            </div>
            
            <div style={{ overflowY: 'auto', padding: '24px', flexGrow: 1 }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Profile Picture</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <Avatar member={currentUser} size={64} />
                  <div>
                    <input type="file" id="avatarUpload" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                    <label htmlFor="avatarUpload" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 16px' }}>
                      <Camera size={14} />
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                  </div>
                </div>
                
                <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Or choose a unique generated avatar:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxHeight: '140px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {availableAvatars.map(av => (
                    <img 
                      key={av.id} 
                      src={av.url} 
                      alt="Avatar Option" 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', border: '2px solid transparent' }} 
                      onClick={() => handleSelectAvatar(av.id, av.url)}
                      onMouseOver={e => e.target.style.borderColor = 'var(--rotary-blue)'}
                      onMouseOut={e => e.target.style.borderColor = 'transparent'}
                    />
                  ))}
                  {availableAvatars.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading avatars...</div>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Mobile Number</label>
                <input type="text" className="form-input" value={editProfileForm.Mobile} onChange={e => setEditProfileForm({...editProfileForm, Mobile: e.target.value})} />
              </div>
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Blood Group</label>
                <select className="form-input" value={editProfileForm["Blood Group"]} onChange={e => setEditProfileForm({...editProfileForm, "Blood Group": e.target.value})}>
                  <option value="">-- Select --</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Birthday</label>
                <input type="text" className="form-input" value={editProfileForm.Birthday} onChange={e => setEditProfileForm({...editProfileForm, Birthday: e.target.value})} placeholder="e.g. 1980-01-01" />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Anniversary</label>
                <input type="text" className="form-input" value={editProfileForm.Anniversary} onChange={e => setEditProfileForm({...editProfileForm, Anniversary: e.target.value})} placeholder="e.g. 2005-05-15" />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditProfileModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.getElementById('root') || document.body)}
`;

content = content.replace(", document.getElementById('root') || document.body)}", ", document.getElementById('root') || document.body)}" + editModalJSX);

fs.writeFileSync('src/pages/Profile.jsx', content);
