import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { seedFirebaseDatabase } from '../services/firebaseSeeder';
import { User, Users, Phone, Mail, Award, Calendar, Link, Settings, Database, LogOut, Activity, X, Camera, Edit2, Info, Key } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { getTagColor } from '../utils/tagColors';
import confetti from 'canvas-confetti';
import './pages.css';

export const Profile = ({ data, refreshData }) => {
  const { currentUser, logout, globalConfig } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadgeForDates, setSelectedBadgeForDates] = useState(null);
  const [seedResult, setSeedResult] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  
  const isBirthdayToday = (dateStr) => {
    if (!dateStr) return false;
    const parts = String(dateStr).toLowerCase().trim().split(/[\s-]+/);
    if (parts.length >= 2) {
      const today = new Date();
      const currentMonthLong = today.toLocaleString('default', { month: 'long' }).toLowerCase();
      const currentMonthShort = today.toLocaleString('default', { month: 'short' }).toLowerCase();
      const currentDay = today.getDate();
      
      let day = -1;
      let month = '';
      if (parts[0].length === 4 && parts.length >= 3) {
        const mNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        month = mNames[mIdx];
        day = parseInt(parts[2], 10);
        if (parts[2].includes('T')) day = parseInt(parts[2].split('T')[0], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parts[1];
      }
      return day === currentDay && (month === currentMonthLong || month === currentMonthShort);
    }
    return false;
  };

  useEffect(() => {
    if (currentUser && currentUser["Birthday"] && isBirthdayToday(currentUser["Birthday"])) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
    }
  }, [currentUser]);

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
  const [editProfileForm, setEditProfileForm] = useState({ Mobile: '', Email: '', "Blood Group": '', Birthday: '', Anniversary: '', CompanyName: '', Industry: '', BusinessDesignation: '' });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Cropper State
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null);
  const [pendingGeneratedAvatarId, setPendingGeneratedAvatarId] = useState(null);

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
  const [editFamilyMemberIndex, setEditFamilyMemberIndex] = useState(null);
  const [savingFamily, setSavingFamily] = useState(false);
  const [allPlatformMembers, setAllPlatformMembers] = useState([]);
  const [linkMode, setLinkMode] = useState('manual');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);


  useEffect(() => {
    if (showEditProfileModal || showEditProfile) {
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
  }, [showEditProfileModal, showEditProfile]);

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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const updateData = {
      Mobile: editProfileForm.Mobile,
      Email: editProfileForm.Email,
      "Blood Group": editProfileForm["Blood Group"],
      Birthday: editProfileForm.Birthday,
      Anniversary: editProfileForm.Anniversary,
      CompanyName: editProfileForm.CompanyName,
      Industry: editProfileForm.Industry,
      BusinessDesignation: editProfileForm.BusinessDesignation
    };
    
    const targetId = editingMemberId || currentUser["Member ID"];
    const targetChapterId = editingMemberId !== currentUser["Member ID"] ? (allPlatformMembers.find(m => m["Member ID"] === targetId)?.chapterId || currentUser.chapterId) : currentUser.chapterId;

    if (pendingAvatarBlob) {
      const resImg = await api.uploadProfilePicture(targetId, pendingAvatarBlob);
      if (resImg.success) {
        updateData.avatarUrl = resImg.url;
      } else {
        alert("Error uploading image: " + resImg.error);
        setSavingProfile(false);
        return;
      }
    } else if (pendingGeneratedAvatarId) {
      const claimRes = await api.claimAvatar(pendingGeneratedAvatarId, targetId);
      if (claimRes.success) {
        updateData.avatarUrl = pendingAvatarUrl;
      } else {
        alert("Error claiming avatar: " + claimRes.error);
        setSavingProfile(false);
        return;
      }
    }

    const res = await api.updateUserProfile(targetChapterId, targetId, updateData);
    
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
      if (editingMemberId) {
         setShowEditProfile(false);
         setEditingMemberId(null);
         setPendingAvatarBlob(null);
         setPendingAvatarUrl(null);
         setPendingGeneratedAvatarId(null);
         refreshData();
      } else {
        const updatedUser = { ...currentUser, ...updateData };
        sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        setShowEditProfile(false);
        setPendingAvatarBlob(null);
        setPendingAvatarUrl(null);
        setPendingGeneratedAvatarId(null);
        window.location.reload();
      }
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
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      croppedImageBlob.name = 'profile.jpeg';
      
      setPendingAvatarBlob(croppedImageBlob);
      setPendingAvatarUrl(URL.createObjectURL(croppedImageBlob));
      setPendingGeneratedAvatarId(null);
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      alert("Error cropping image: " + e.message);
    }
  };


  const handleSelectAvatar = async (avatarId, url) => {
    setPendingGeneratedAvatarId(avatarId);
    setPendingAvatarUrl(url);
    setPendingAvatarBlob(null);
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
    
    // Auto-approve if they are PST or if it's a non-Rotarian family member
    const finalForm = { ...familyForm, status: (isCore || linkMode !== 'existing') ? 'approved' : 'pending' };

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

    let updatedFamily;
    if (editFamilyMemberIndex !== null) {
      updatedFamily = [...(currentUser.FamilyMembers || [])];
      updatedFamily[editFamilyMemberIndex] = finalForm;
    } else {
      updatedFamily = [...(currentUser.FamilyMembers || []), finalForm];
    }
    
    const res = await api.updateFamilyMembers(currentUser.chapterId, currentUser["Member ID"], updatedFamily);
    setSavingFamily(false);
    if (res.success) {
      setShowFamilyModal(false);
      setEditFamilyMemberIndex(null);
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

      {currentUser && currentUser["Birthday"] && isBirthdayToday(currentUser["Birthday"]) && (
        <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#fff', padding: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '12px' }}>
          🎉 Happy Birthday, {currentUser["Name"].split(' ')[0]}! Have a wonderful day! 🎂
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => {
              setEditingMemberId(currentUser["Member ID"]);
              setEditProfileForm({
                Mobile: currentUser.Mobile || '',
                Email: currentUser.Email || '',
                "Blood Group": currentUser["Blood Group"] || '',
                Birthday: currentUser.Birthday || '',
                Anniversary: currentUser.Anniversary || '',
                CompanyName: currentUser.CompanyName || '',
                Industry: currentUser.Industry || '',
                BusinessDesignation: currentUser.BusinessDesignation || ''
              });
              setShowEditProfile(true);
            }}>
              <Edit2 size={16} /> Edit Profile
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPinModal(true)}>
              <Key size={16} /> Change PIN
            </button>
          </div>
          
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

        {/* Business Information Card */}
        <div className="card">
          <div className="card-title">
            <Link size={18} style={{ color: 'var(--rotary-gold)' }} />
            Business Information
          </div>
          <div className="member-detail-fields" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div className="detail-field-row">
              <span className="detail-field-label">Company Name</span>
              <span className="detail-field-value">{currentUser["CompanyName"] || "Not Specified"}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Industry</span>
              <span className="detail-field-value">{currentUser["Industry"] || "Not Specified"}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Designation</span>
              <span className="detail-field-value">{currentUser["BusinessDesignation"] || "Not Specified"}</span>
            </div>
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
              onClick={() => {
                setEditFamilyMemberIndex(null);
                setFamilyForm({ name: '', relation: '', birthday: '', isRotarian: false, rotaryId: '' });
                setShowFamilyModal(true);
              }}
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
                    {fm.status === 'pending' && (
                      <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 600, color: '#eab308', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fef08a' }}>
                        Pending PST Approval
                      </div>
                    )}

                    {!platformMember && (
                      <button 
                        onClick={() => {
                          setEditFamilyMemberIndex(idx);
                          setFamilyForm(fm);
                          setShowFamilyModal(true);
                        }}
                        style={{ marginTop: '12px', padding: '4px 8px', fontSize: '12px' }}
                        className="btn btn-secondary"
                      >
                        <Edit2 size={12} style={{ marginRight: '4px' }} /> Edit
                      </button>
                    )}
                    
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
          <div style={{ padding: '0 16px 16px 16px' }}>
            <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <Info size={16} style={{ color: 'var(--rotary-blue)' }} /> How to earn trophies
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Early Bird:</strong> You get this trophy the moment you pay any outstanding club dues.</li>
                <li><strong>Philanthropist:</strong> Awarded automatically if you make a payment where the purpose is logged as a "donation" or "charity".</li>
                <li><strong>Active Participant:</strong> You earn this as soon as you are marked as "Present" for at least one meeting or event in the attendance register.</li>
                <li><strong>Opinion Leader:</strong> Awarded automatically if you submit any feedback or share an opinion through the app.</li>
              </ul>
            </div>
            {(() => {
              const displayUser = data?.members?.find(m => String(m["Member ID"] || m.id) === String(currentUser?.["Member ID"] || currentUser?.id)) || currentUser;
              
              if (displayUser.badges && displayUser.badges.length > 0) {
                const groupedBadgesMap = displayUser.badges.reduce((acc, badge) => {
                  if (!acc[badge.name]) {
                    acc[badge.name] = { ...badge, count: 0, dates: [] };
                  }
                  acc[badge.name].count += 1;
                  if (badge.date) {
                    acc[badge.name].dates.push(badge.date);
                  }
                  return acc;
                }, {});
                const uniqueBadges = Object.values(groupedBadgesMap);
                const badgeStyleVersion = globalConfig?.badgeStyleVersion || 'v2';

                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                    {uniqueBadges.map((badge, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedBadgeForDates(badge)}
                        style={badgeStyleVersion === 'v1' ? { 
                          flex: '0 1 180px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          background: '#ffffff', 
                          border: '1px solid var(--border-color)', 
                          padding: '24px 16px', 
                          borderRadius: '16px', 
                          minWidth: '160px', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          textAlign: 'center',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          cursor: 'pointer',
                          position: 'relative'
                        } : { 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          width: '120px',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        {badgeStyleVersion === 'v1' ? (
                          <>
                            {badge.count > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'var(--rotary-gold)',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 10
                              }}>
                                {badge.count}
                              </div>
                            )}
                            {badge.image ? (
                              <div style={{ width: '80px', height: '80px', marginBottom: '16px', position: 'relative' }}>
                                <img 
                                  src={badge.image} 
                                  alt={badge.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} 
                                />
                              </div>
                            ) : (
                              <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--rotary-gold)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '12px'
                              }}>
                                <Award size={32} />
                              </div>
                            )}
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px', lineHeight: '1.2' }}>
                              {typeof badge.name === 'object' ? badge.name?.name || JSON.stringify(badge.name) : badge.name}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              background: '#000000',
                              border: '2px solid var(--rotary-gold)',
                              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              marginBottom: '24px',
                              padding: '0px',
                              boxSizing: 'border-box'
                            }}>
                              {badge.count > 0 && (
                                <div style={{
                                  position: 'absolute',
                                  top: '0px',
                                  right: '0px',
                                  background: 'var(--rotary-gold)',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '26px',
                                  height: '26px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  zIndex: 10,
                                  border: '2px solid #000'
                                }}>
                                  {badge.count}
                                </div>
                              )}
                              {badge.image ? (
                                <img 
                                  src={badge.image} 
                                  alt={badge.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} 
                                />
                              ) : (
                                <div style={{
                                  width: '100%', height: '100%', borderRadius: '50%', background: '#000000', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rotary-gold)'
                                }}>
                                  <Award size={48} />
                                </div>
                              )}
                              <div style={{
                                position: 'absolute',
                                bottom: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1a1a1a',
                                border: '1px solid var(--rotary-gold)',
                                color: '#fff',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 5
                              }}>
                                {badge.name}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              } else {
                return <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No trophies earned yet. Complete activities to earn them!</p>;
              }
            })()}

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
                {activities.slice(0, 5).map(act => (
                  <div key={act.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{act.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{act.description || (act.amount ? `₹${act.amount}` : '')}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{new Date(act.timestamp || act.date).toLocaleString()}</div>
                  </div>
                ))}
                {activities.length > 5 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '8px' }}
                    onClick={() => setShowAllActivitiesModal(true)}
                  >
                    View All Activities ({activities.length})
                  </button>
                )}
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

      {/* Add/Edit Family Member Modal */}
      <Modal
        isOpen={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        title={editFamilyMemberIndex !== null ? "Edit Family Member" : "Add Family Member"}
        subtitle={editFamilyMemberIndex !== null ? "Update details for this family member." : "Link a spouse or child to your profile."}
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFamilyModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveFamilyMember} disabled={savingFamily}>
              {savingFamily ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        {editFamilyMemberIndex === null && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" checked={linkMode === 'manual'} onChange={() => { setLinkMode('manual'); setSelectedMemberId(''); setMemberSearchQuery(''); }} /> Add Manually
            </label>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" checked={linkMode === 'existing'} onChange={() => { setLinkMode('existing'); setMemberSearchQuery(''); }} /> Link Existing Member
            </label>
          </div>
        )}

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

        {editFamilyMemberIndex === null && (
          <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={familyForm.isRotarian} onChange={e => setFamilyForm({...familyForm, isRotarian: e.target.checked})} id="isRot" disabled={linkMode === 'existing' && !!selectedMemberId} />
            <label htmlFor="isRot" style={{ fontSize: '14px' }}>Is this person a Rotarian?</label>
          </div>
        )}

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
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCrop}>
                Confirm Crop
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
        isOpen={showEditProfile}
        onClose={() => { 
          setShowEditProfile(false); 
          setEditingMemberId(null); 
          setPendingAvatarBlob(null);
          setPendingAvatarUrl(null);
          setPendingGeneratedAvatarId(null);
        }}
        title="Edit Profile"
        subtitle="Update your personal details and avatar."
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
              setShowEditProfile(false);
              setEditingMemberId(null);
              setPendingAvatarBlob(null);
              setPendingAvatarUrl(null);
              setPendingGeneratedAvatarId(null);
            }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Profile Picture</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Avatar member={{...((editingMemberId ? allPlatformMembers.find(m => m["Member ID"] === editingMemberId) : currentUser) || currentUser), avatarUrl: pendingAvatarUrl || (editingMemberId ? allPlatformMembers.find(m => m["Member ID"] === editingMemberId)?.avatarUrl : currentUser.avatarUrl)}} size={64} />
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
                style={{ width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', border: pendingGeneratedAvatarId === av.id ? '2px solid var(--rotary-blue)' : '2px solid transparent' }} 
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

        <div style={{ marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Business Information</h3>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Company Name</label>
          <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Acme Corp" value={editProfileForm.CompanyName} onChange={e => setEditProfileForm({...editProfileForm, CompanyName: e.target.value})} />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Industry</label>
          <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Real Estate, Healthcare" value={editProfileForm.Industry} onChange={e => setEditProfileForm({...editProfileForm, Industry: e.target.value})} />
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Designation</label>
          <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. CEO, Founder" value={editProfileForm.BusinessDesignation} onChange={e => setEditProfileForm({...editProfileForm, BusinessDesignation: e.target.value})} />
        </div>
      </Modal>

      {selectedBadgeForDates && (
        <Modal isOpen={true} title={`${selectedBadgeForDates.name} Earned Dates`} onClose={() => setSelectedBadgeForDates(null)}>
          <div style={{ padding: '20px' }}>
            {selectedBadgeForDates.dates && selectedBadgeForDates.dates.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {selectedBadgeForDates.dates.map((date, idx) => (
                  <li key={idx} style={{ marginBottom: '8px', fontSize: '14px' }}>
                    {date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No specific dates recorded for this trophy.</p>
            )}
          </div>
          <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedBadgeForDates(null)}>Close</button>
          </div>
        </Modal>
      )}

      <Modal 
        isOpen={showAllActivitiesModal} 
        onClose={() => setShowAllActivitiesModal(false)}
        title="My Activities"
        subtitle="All your recorded activities and interactions"
      >
        <div style={{ padding: '16px 0', maxHeight: '60vh', overflowY: 'auto' }}>
          {activities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((act) => (
                <div key={act.id} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', marginBottom: '4px' }}>{act.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{act.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(act.timestamp || act.date).toLocaleString()}</div>
                  </div>
                  {act.amount && (
                    <div style={{ fontWeight: 700, color: 'var(--rotary-blue)', fontSize: '15px' }}>
                      ₹{act.amount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No activities found.</p>
          )}
        </div>
        <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAllActivitiesModal(false)}>Close</button>
        </div>
      </Modal>

    </div>
  );
};
