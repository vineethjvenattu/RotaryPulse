import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { seedFirebaseDatabase } from '../services/firebaseSeeder';
import { User, Users, Phone, Mail, Award, Calendar, Link, Settings, Database, LogOut, Activity, X, Camera, Edit2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { getTagColor } from '../utils/tagColors';
import './pages.css';

export const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [activities, setActivities] = useState([]);
  

  const formatDateDisplay = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      let year = d.getFullYear();
      if (year < 100) year += 2000;
      return `${day}-${month}-${year}`;
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
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Edit Profile State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ Mobile: '', Email: '', "Blood Group": '', Birthday: '', Anniversary: '' });
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Cropper State
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // Change PIN State
  const [showPinModal, setShowPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [changingPin, setChangingPin] = useState(false);


  // Family Members State
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: '', relation: '', birthday: '', isRotarian: false, rotaryId: '' });
  const [savingFamily, setSavingFamily] = useState(false);
  const [allPlatformMembers, setAllPlatformMembers] = useState([]);
  const [linkMode, setLinkMode] = useState('manual');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);


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

  useEffect(() => {
    if (showFamilyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showFamilyModal]);

  useEffect(() => {
    if (currentUser) {
      api.getMyActivities(currentUser.chapterId, currentUser["Member ID"]).then(setActivities);
      api.getAllPlatformMembers().then(res => {
        if (res.success) {
          setAllPlatformMembers(res.data || []);
        }
      });
    }
  }, [currentUser]);


  
  
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

  const handleClassificationChange = (e) => {
    const val = e.target.value;
    if (val) {
      setClassification(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
    } else {
      setClassification('');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const updateData = {
      Mobile: editProfileForm.Mobile,
      Email: editProfileForm.Email,
      "Blood Group": editProfileForm["Blood Group"],
      Birthday: editProfileForm.Birthday,
      Anniversary: editProfileForm.Anniversary
    };
    const res = await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
    
    // Intelligently assign wedding date to spouse
    if (res.success && updateData.Anniversary && currentUser.FamilyMembers) {
      const spouse = currentUser.FamilyMembers.find(f => f.relation === 'Spouse');
      if (spouse && spouse.id && spouse.id.trim() !== '' && !spouse.id.startsWith('fm_')) {
        // The spouse is a platform member
        const targetMember = allPlatformMembers.find(m => m["Member ID"] === spouse.id);
        if (targetMember && targetMember["Anniversary"] !== updateData.Anniversary) {
           await api.updateUserProfile(targetMember.chapterId || currentUser.chapterId, spouse.id, { Anniversary: updateData.Anniversary });
        }
      }
    }

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

  
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleSaveCrop = async () => {
    try {
      setUploadingImage(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      croppedImageBlob.name = 'profile.jpeg';
      
      const res = await api.uploadProfilePicture(currentUser["Member ID"], croppedImageBlob);
      if (res.success) {
        const updateData = { avatarUrl: res.url };
        await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
        const updatedUser = { ...currentUser, ...updateData };
        sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        setShowCropper(false);
        window.location.reload();
      } else {
        alert("Error uploading image: " + res.error);
        setUploadingImage(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error cropping image: " + e.message);
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

  const handleSeedDatabase = async () => {
    if (!window.confirm("Are you sure you want to seed the Firestore database with initial mock data? This will overwrite or add initial documents.")) {
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedFirebaseDatabase();
      if (res.success) {
        setSeedResult({ success: true, message: "Database seeded successfully!" });
      } else {
        setSeedResult({ success: false, message: res.error || "Failed to seed database" });
      }
    } catch (err) {
      setSeedResult({ success: false, message: err.toString() });
    } finally {
      setSeeding(false);
    }
  };

  const searchableMembers = useMemo(() => {
    const list = [];
    allPlatformMembers.forEach(m => {
      if (m["Member ID"] !== currentUser["Member ID"]) {
        list.push({
          id: m["Member ID"],
          name: m["Name"],
          type: 'Platform Member',
          subtitle: `${m.chapterId || 'No Chapter'} • ${m["Member ID"]}`,
          originalData: m
        });
        
        if (m.FamilyMembers && Array.isArray(m.FamilyMembers)) {
          m.FamilyMembers.forEach((fm, idx) => {
            if (!fm.id) {
              list.push({
                id: `fm_${m["Member ID"]}_${idx}`,
                name: fm.name,
                type: 'Family Member',
                subtitle: `Family of ${m["Name"]}`,
                originalData: {
                  "Name": fm.name,
                  "Birthday": fm.birthday || '',
                  "Rotary ID": fm.rotaryId || '',
                  "isFamilyMember": true
                }
              });
            }
          });
        }
      }
    });
    return list;
  }, [allPlatformMembers, currentUser]);

  const handleSelectExisting = (id) => {
    setSelectedMemberId(id);
    if (!id) return;
    const member = searchableMembers.find(m => m.id === id);
    if (member) {
      const data = member.originalData;
      setFamilyForm({
        ...familyForm,
        name: data["Name"],
        birthday: data["Birthday"] || '',
        isRotarian: !data.isFamilyMember,
        rotaryId: data["Rotary ID"] || (!data.isFamilyMember ? id : '')
      });
    }
  };

  const handleSaveFamilyMember = async () => {
    if (!familyForm.name || !familyForm.relation) return alert("Name and Relation are required.");
    setSavingFamily(true);
    
    const configRes = await api.getGlobalConfig();
    const coreRoles = (configRes.success && configRes.config && configRes.config.coreCommitteeRoles) ? configRes.config.coreCommitteeRoles : ['President', 'Secretary', 'Treasurer'];
    const isCore = coreRoles.includes(currentUser.Role) || currentUser.isSuperAdmin;
    
    const finalForm = { ...familyForm, status: isCore ? 'approved' : 'pending' };

    if (linkMode === 'existing' && selectedMemberId && !selectedMemberId.startsWith('fm_')) {
      finalForm.id = selectedMemberId;
      
      const targetMember = allPlatformMembers.find(m => m["Member ID"] === selectedMemberId);
      if (targetMember) {
        const reciprocalRelations = {
          'Spouse': 'Spouse',
          'Child': 'Parent',
          'Parent': 'Child',
          'Other': 'Other'
        };
        const reciprocalRelation = reciprocalRelations[familyForm.relation] || 'Other';
        
        const reciprocalFamilyForm = {
          id: currentUser["Member ID"],
          name: currentUser["Name"],
          relation: reciprocalRelation,
          birthday: currentUser["Birthday"] || '',
          isRotarian: true,
          rotaryId: currentUser["Rotary ID"] || currentUser["Member ID"],
          status: isCore ? 'approved' : 'pending'
        };
        
        const existingFamily = targetMember.FamilyMembers || [];
        const filteredFamily = existingFamily.filter(f => f.id !== currentUser["Member ID"]);
        const targetUpdatedFamily = [...filteredFamily, reciprocalFamilyForm];
        await api.updateFamilyMembers(targetMember.chapterId || currentUser.chapterId, selectedMemberId, targetUpdatedFamily);
      }
    }

    const updatedFamily = [...(currentUser.FamilyMembers || []), finalForm];
    const res = await api.updateFamilyMembers(currentUser.chapterId, currentUser["Member ID"], updatedFamily);
    setSavingFamily(false);
    if (res.success) {
      setShowFamilyModal(false);
      setFamilyForm({ name: '', relation: '', birthday: '', isRotarian: false, rotaryId: '' });
      
      // Update local storage so the reload sees the new data
      const updatedUser = { ...currentUser, FamilyMembers: updatedFamily };
      sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      
      window.location.reload();
    } else {
      alert("Error saving family member: " + res.error);
    }
  };

  const handleRemoveFamilyMember = async (index) => {
    if (!window.confirm("Remove this family member?")) return;
    const familyMemberToRemove = currentUser.FamilyMembers[index];
    const updatedFamily = [...(currentUser.FamilyMembers || [])];
    updatedFamily.splice(index, 1);
    
    // Bi-directional unlinking
    if (familyMemberToRemove && familyMemberToRemove.id) {
      const targetMember = allPlatformMembers.find(m => m["Member ID"] === familyMemberToRemove.id);
      if (targetMember) {
        const existingFamily = targetMember.FamilyMembers || [];
        const targetUpdatedFamily = existingFamily.filter(f => f.id !== currentUser["Member ID"]);
        await api.updateFamilyMembers(targetMember.chapterId || currentUser.chapterId, familyMemberToRemove.id, targetUpdatedFamily);
      }
    }

    const res = await api.updateFamilyMembers(currentUser.chapterId, currentUser["Member ID"], updatedFamily);
    if (res.success) {
      const updatedUser = { ...currentUser, FamilyMembers: updatedFamily };
      sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
      window.location.reload();
    } else {
      alert("Error removing family member: " + res.error);
    }
  };

  if (!currentUser) return null;

  const selectedMemberData = selectedMemberId 
    ? searchableMembers.find(m => m.id === selectedMemberId)?.originalData 
    : null;
  const hasOriginalBirthday = !!(selectedMemberData && selectedMemberData["Birthday"]);
  const hasOriginalRotaryId = !!(selectedMemberData && selectedMemberData["Rotary ID"]);

  const filteredMembers = searchableMembers.filter(m => 
    m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>My Profile</h1>
          <p className="page-subtitle">View your membership details and system configurations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px', position: 'relative' }}>
          <button 
            onClick={() => {
              setEditProfileForm({
                Mobile: currentUser["Mobile"] || '',
                Email: currentUser["Email"] || '',
                "Blood Group": currentUser["Blood Group"] || '',
                Birthday: toDateInputValue(currentUser["Birthday"]),
                Anniversary: toDateInputValue(currentUser["Anniversary"])
              });
              setShowEditProfileModal(true);
            }}
            style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Edit Profile"
          >
            <Edit2 size={16} />
          </button>
          
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOldPin('');
              setNewPin('');
              setConfirmNewPin('');
              setPinError('');
              setPinSuccess('');
              setShowPinModal(true);
            }}
            style={{ position: 'absolute', top: '24px', right: '64px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Change PIN"
          >
            <Settings size={16} />
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
        </div>

        {/* Detailed Fields Card */}
        <div className="card">
          <div className="card-title">
            <Award size={18} style={{ color: 'var(--rotary-blue)' }} />
            Rotary Member Information
          </div>
          <div className="member-detail-fields" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div className="detail-field-row">
              <span className="detail-field-label">Rotary ID</span>
              <span className="detail-field-value">{currentUser["Member ID"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Email ID</span>
              <span className="detail-field-value" style={{ wordBreak: 'break-all' }}>{currentUser["Email"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Classification</span>
              <span className="detail-field-value">{currentUser["Classification"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Blood Group</span>
              <span className="detail-field-value" style={{ color: 'var(--error)', fontWeight: 600 }}>{currentUser["Blood Group"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Birthday</span>
              <span className="detail-field-value">
                🎂 {formatDateDisplay(currentUser["Birthday"]) || "Not Specified"}
              </span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Wedding Anniversary</span>
              <span className="detail-field-value">💍 {formatDateDisplay(currentUser["Anniversary"]) || "Single / Not Specified"}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Join Date</span>
              <span className="detail-field-value">📅 {formatDateDisplay(currentUser["Join Date"])}</span>
            </div>
            {currentUser.Designations && currentUser.Designations.length > 0 && (
              <div className="detail-field-row">
                <span className="detail-field-label">Designations</span>
                <span className="detail-field-value">
                  {currentUser.Designations.map(d => {
                    const tagColor = getTagColor(d);
                    return (
                      <span key={d} style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: tagColor.bg, color: tagColor.text, marginRight: '6px',
                        border: `1px solid ${tagColor.bg}`
                      }}>
                        {d}
                      </span>
                    );
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Family Members Card */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--rotary-blue)' }} />
              Family Members
            </div>
            <button 
              onClick={() => setShowFamilyModal(true)}
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }}
            >
              + Add
            </button>
          </div>
          <div style={{ padding: '16px' }}>
            {currentUser.FamilyMembers && currentUser.FamilyMembers.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {currentUser.FamilyMembers.map((fm, idx) => {
                  const platformMember = fm.id && !fm.id.startsWith('fm_') ? allPlatformMembers.find(m => m["Member ID"] === fm.id) : null;
                  const avatarSrc = platformMember ? (platformMember.avatarUrl || platformMember.photoURL || platformMember.Image) : null;
                  
                  return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: '#ffffff', border: '1px solid var(--border-color)', padding: '20px 16px', borderRadius: '12px', minWidth: '120px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    {avatarSrc ? (
                      <img 
                        src={avatarSrc} 
                        alt={fm.name} 
                        style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                      />
                    ) : (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '50%', background: 'var(--rotary-blue, #005eaa)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px', fontWeight: '600', color: '#ffffff',
                        marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,94,170,0.2)'
                      }}>
                        {fm.name ? fm.name.substring(0,2).toUpperCase() : '?'}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center', marginBottom: '6px' }}>
                      {fm.name}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'center', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px' }}>
                      {fm.relation}
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveFamilyMember(idx)} 
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ffffff', borderRadius: '50%', border: '1px solid #e2e8f0', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                      title="Remove Family Member"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No family members linked.</p>
            )}
          </div>
        </div>

        {/* Badges / Trophy Case */}
        <div className="card">
          <div className="card-title">
            <Award size={18} style={{ color: 'var(--rotary-blue)' }} />
            Trophy Case
          </div>
          <div style={{ padding: '16px' }}>
            {currentUser.badges && currentUser.badges.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {currentUser.badges.map((badge, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    background: '#ffffff', 
                    border: '1px solid var(--border-color)', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    minWidth: '120px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    textAlign: 'center'
                  }}>
                    {badge.image ? (
                      <img 
                        src={badge.image} 
                        alt={badge.name} 
                        style={{ width: '64px', height: '64px', marginBottom: '12px', objectFit: 'contain' }} 
                      />
                    ) : (
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: 'var(--rotary-gold)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '12px'
                      }}>
                        <Award size={32} />
                      </div>
                    )}
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', marginBottom: '4px' }}>
                      {badge.name}
                    </div>
                    {badge.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {badge.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No badges earned yet. Participate in events and activities to earn badges!</p>
            )}

            {/* Endorsements List */}
            {currentUser.endorsements && currentUser.endorsements.length > 0 && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Endorsements from Peers</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentUser.endorsements.map((endors, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{typeof endors.endorserName === 'object' ? 'A Peer' : (endors.endorserName || 'A Peer')}</span> endorsed you for <span style={{ fontWeight: 600, color: 'var(--rotary-blue)' }}>Team Player</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Activities Card */}
        <div className="card">
          <div className="card-title">
            <Activity size={18} style={{ color: 'var(--rotary-gold)' }} />
            My Activities
          </div>
          <div style={{ padding: '16px' }}>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activities.map(act => (
                  <div key={act.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{act.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{act.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{new Date(act.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No activities recorded yet.</p>
            )}
          </div>
        </div>

        <button 
          onClick={logout} 
          className="btn btn-secondary"
          style={{ width: '100%', padding: '14px', color: 'var(--error)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={16} />
          Sign Out of Account
        </button>

      </div>

      {/* Add Family Member Modal */}
      <Modal
        isOpen={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        title="Add Family Member"
        subtitle="Link a spouse or child to your profile."
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFamilyModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveFamilyMember} disabled={savingFamily}>
              {savingFamily ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="radio" checked={linkMode === 'manual'} onChange={() => { setLinkMode('manual'); setSelectedMemberId(''); setMemberSearchQuery(''); }} /> Add Manually
          </label>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="radio" checked={linkMode === 'existing'} onChange={() => { setLinkMode('existing'); setMemberSearchQuery(''); }} /> Link Existing Member
          </label>
        </div>

        {linkMode === 'existing' && (
          <div className="form-group" style={{ marginBottom: '16px', position: 'relative' }}>
            <label className="form-label">Select Platform Member</label>
            <input 
              type="text" 
              className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
              placeholder="Type to search members..." 
              value={memberSearchQuery}
              onChange={e => {
                setMemberSearchQuery(e.target.value);
                setShowMemberDropdown(true);
                if (!e.target.value) {
                  handleSelectExisting('');
                }
              }}
              onFocus={() => setShowMemberDropdown(true)}
            />
            {showMemberDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-md)', marginTop: '4px' }}>
                {filteredMembers.slice(0, 50).map(m => (
                  <div 
                    key={m.id} 
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selectedMemberId === m.id ? '#f1f5f9' : 'white' }}
                    onClick={() => {
                      handleSelectExisting(m.id);
                      setMemberSearchQuery(m.name);
                      setShowMemberDropdown(false);
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#0F172A' }}>
                      {m.name}
                      <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle' }}>
                        {m.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.subtitle}</div>
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>No members found</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Name</label>
          {linkMode === 'existing' && selectedMemberId ? (
            <div className="form-input" style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              {selectedMemberData?.["Name"] || familyForm.name}
            </div>
          ) : (
            <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={familyForm.name} onChange={e => setFamilyForm({...familyForm, name: e.target.value})} placeholder="John Doe" />
          )}
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Relation</label>
          <select className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={familyForm.relation} onChange={e => setFamilyForm({...familyForm, relation: e.target.value})}>
            <option value="">-- Select --</option>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Parent">Parent</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Birthday (Optional)</label>
          {hasOriginalBirthday ? (
            <div className="form-input" style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              {(() => {
                const dateStr = selectedMemberData["Birthday"];
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                  return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-XXXX`;
                }
                const parts = String(dateStr).split('-');
                if (parts.length === 3) return `${parts[0]}-${parts[1]}-XXXX`;
                return "***";
              })()}
            </div>
          ) : (
            <input type="date" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={familyForm.birthday} onChange={e => setFamilyForm({...familyForm, birthday: e.target.value})} />
          )}
        </div>

        <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={familyForm.isRotarian} onChange={e => setFamilyForm({...familyForm, isRotarian: e.target.checked})} id="isRot" disabled={linkMode === 'existing' && !!selectedMemberId} />
          <label htmlFor="isRot" style={{ fontSize: '14px' }}>Is this person a Rotarian?</label>
        </div>

        {familyForm.isRotarian && (
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Rotary ID (Optional)</label>
            {hasOriginalRotaryId ? (
              <div className="form-input" style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                {selectedMemberData["Rotary ID"]}
              </div>
            ) : (
              <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={familyForm.rotaryId} onChange={e => setFamilyForm({...familyForm, rotaryId: e.target.value})} placeholder="1234567" />
            )}
          </div>
        )}
      </Modal>
      {/* Cropper Modal */}
      {showCropper && createPortal(
        <div style={{ zIndex: 10000, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.8)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ padding: '24px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => {
                setZoom(e.target.value)
              }}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCropper(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCrop} disabled={uploadingImage}>
                {uploadingImage ? 'Uploading...' : 'Save & Upload'}
              </button>
            </div>
          </div>
        </div>
      , document.getElementById('root') || document.body)}



      <Modal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        title="Change PIN"
        subtitle="Set a new secure PIN for your account."
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPinModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleChangePin} disabled={changingPin}>
              {changingPin ? 'Updating...' : 'Change PIN'}
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Current PIN</label>
          <input 
            type="password" 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
            value={oldPin} 
            onChange={e => setOldPin(e.target.value)} 
            placeholder="Enter current PIN"
            maxLength={6}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">New PIN</label>
          <input 
            type="password" 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
            value={newPin} 
            onChange={e => setNewPin(e.target.value)} 
            placeholder="Enter new 6-digit PIN"
            maxLength={6}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Confirm New PIN</label>
          <input 
            type="password" 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
            value={confirmNewPin} 
            onChange={e => setConfirmNewPin(e.target.value)} 
            placeholder="Confirm new 6-digit PIN"
            maxLength={6}
          />
        </div>
        {pinError && <p style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{pinError}</p>}
        {pinSuccess && <p style={{ color: 'var(--success)', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{pinSuccess}</p>}
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        title="Edit Profile"
        subtitle="Update your personal details and avatar."
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditProfileModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Profile Picture</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Avatar member={currentUser} size={64} />
            <div>
              <input type="file" id="avatarUpload" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
              <label htmlFor="avatarUpload" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 16px' }}>
                <Camera size={14} />
                Choose Image
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
          <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editProfileForm.Mobile} onChange={e => setEditProfileForm({...editProfileForm, Mobile: e.target.value})} />
        </div>
        
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Email ID</label>
          <input type="email" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editProfileForm.Email} onChange={e => setEditProfileForm({...editProfileForm, Email: e.target.value})} />
        </div>
        
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Blood Group</label>
          <select className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editProfileForm["Blood Group"]} onChange={e => setEditProfileForm({...editProfileForm, "Blood Group": e.target.value})}>
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
          <input type="date" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editProfileForm.Birthday} onChange={e => setEditProfileForm({...editProfileForm, Birthday: e.target.value})} />
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Anniversary</label>
          <input type="date" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editProfileForm.Anniversary} onChange={e => setEditProfileForm({...editProfileForm, Anniversary: e.target.value})} />
        </div>
      </Modal>

    </div>
  );
};
