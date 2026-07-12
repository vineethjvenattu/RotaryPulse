import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Phone, MessageCircle, Mail, X, Info, ArrowLeft, Edit2, AlertCircle, Award, Lock, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Papa from 'papaparse';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { UpgradeModal } from '../components/UpgradeModal';
import confetti from 'canvas-confetti';
import './pages.css';

export const Members = ({ data, loading, refreshData, viewMemberId, clearViewMemberId, setActiveTab }) => {
  const { isPresident, isSecretary, isTreasurer, currentUser, role } = useAuth();
  const isPST = isPresident || isSecretary || isTreasurer;
  const canViewContacts = currentUser?.subscriptionStatus === 'Active' || isPST || currentUser?.isSuperAdmin;
  const [chapterSettings, setChapterSettings] = useState(null);
  const [globalRoles, setGlobalRoles] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ Mobile: "", Email: "", "Blood Group": "", Birthday: "", Anniversary: "", CompanyName: "", Industry: "", BusinessDesignation: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [editRole, setEditRole] = useState('');
  const [deletionNotes, setDeletionNotes] = useState('');
  const [pendingPayments, setPendingPayments] = useState([]);
  const [fetchingPayments, setFetchingPayments] = useState(false);
  const [duesAction, setDuesAction] = useState('none');
  const [savingDesignations, setSavingDesignations] = useState(false);
  
  const [selectedBadgeForDates, setSelectedBadgeForDates] = useState(null);

  // Endorse State
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [endorsing, setEndorsing] = useState(false);
  const [endorseError, setEndorseError] = useState('');
  const [endorseSuccess, setEndorseSuccess] = useState('');

  React.useEffect(() => {
    if (viewMemberId && data?.members) {
      const member = data.members.find(m => m["Member ID"] === viewMemberId);
      if (member) {
        setSelectedMember(member);
      }
      if (clearViewMemberId) clearViewMemberId();
    }
  }, [viewMemberId, data?.members, clearViewMemberId]);

  React.useEffect(() => {
    if (currentUser?.chapterId) {
      api.getChapterData(currentUser.chapterId).then(res => {
        if (res.success) setChapterSettings(res.data);
      });
    }
    api.getGlobalConfig().then(res => {
      if (res.success) setGlobalRoles(res.config.roles || []);
    });
  }, [currentUser]);

  const handleRoleChange = async () => {
    if (!editRole) return;
    const result = await api.changeMemberRole((selectedMember["Member ID"] || selectedMember.id), editRole);
    if (result.success) {
      alert("Role updated successfully!");
      if (refreshData) refreshData(true);
      setShowEditModal(false);
    } else {
      alert("Error updating role: " + result.error);
    }
  };

  const handleRequestProfileEdit = async () => {
    if (!selectedMember) return;
    setSavingProfile(true);
    let requiredApprovers = ["president", "secretary", "treasurer"];
    const userRole = currentUser?.Role ? String(currentUser.Role).trim().toLowerCase() : "";
    if (requiredApprovers.includes(userRole)) {
      requiredApprovers = requiredApprovers.filter(r => r !== userRole);
    }
    const result = await api.requestProfileEdit(
      currentUser.chapterId, 
      selectedMember["Member ID"] || selectedMember.id, 
      selectedMember.Name, 
      editProfileForm, 
      currentUser, 
      requiredApprovers
    );
    setSavingProfile(false);
    if (result.success) {
      alert("Profile edit proposed successfully! It will be applied once other PST members approve.");
      setShowEditProfileModal(false);
    } else {
      alert("Error proposing profile edit: " + result.error);
    }
  };

  const handleProposeDeletion = async () => {
    if (!deletionNotes.trim()) {
      alert("Please provide a reason/notes for deletion.");
      return;
    }
    const chapterId = currentUser?.chapterId || currentUser?.["Chapter ID"] || "12103853";
    const result = await api.proposeMemberDeletion(
      chapterId, 
      (selectedMember["Member ID"] || selectedMember.id), 
      deletionNotes, 
      role, 
      duesAction
    );
    if (result.success) {
      alert("Deletion request proposed. Requires 2 more core member approvals.");
      setShowEditModal(false);
      setDeletionNotes('');
    } else {
      alert("Error: " + result.error);
    }
  };

  const systemFields = ['id', 'chapterId', 'Pin', 'status', 'SearchName', 'Name', 'Role', 'Mobile', 'Member ID', 'Rotary ID', 'hasPin', 'FamilyMembers', 'Designations', 'badges', 'endorsements', 'usedCriteria'];
  
  const standardFieldOrder = ["Gender", "Birthday", "Blood Group", "Spouse Name", "Email", "Address", "Profession", "Classification"];
  
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

  React.useEffect(() => {
    if (selectedMember && selectedMember["Birthday"] && isBirthdayToday(selectedMember["Birthday"])) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
    }
  }, [selectedMember]);
  
  const sortFields = (a, b) => {
    const idxA = standardFieldOrder.indexOf(a);
    const idxB = standardFieldOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  };
  
  const getDynamicFields = (member) => {
    const keys = Object.keys(member).filter(k => !systemFields.includes(k) && member[k]);
    keys.sort(sortFields);
    if (currentUser?.isSuperAdmin) return keys;
    if (!chapterSettings?.allowedMemberCardFields) return [];
    return keys.filter(k => chapterSettings.allowedMemberCardFields.includes(k));
  };
  
  const formatFieldValue = (field, value, memberId) => {
    if (field === 'Birthday' && value && value !== "Not Specified") {
      const canViewFull = currentUser?.isSuperAdmin || currentUser?.["Member ID"] === memberId;
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        let year = d.getFullYear();
        if (year < 100) year += 2000;
        return canViewFull ? `${day}-${month}-${year}` : `${day}-${month}-XXXX`;
      }
      if (!canViewFull) {
        const parts = String(value).split('-');
        if (parts.length === 3) return `${parts[0]}-${parts[1]}-XXXX`;
        return "***";
      }
      return value;
    }
    return value;
  };

  const handleEndorseMember = async () => {
    setEndorsing(true);
    setEndorseError('');
    setEndorseSuccess('');
    
    const res = await api.endorseMember(
      currentUser.chapterId,
      selectedMember["Member ID"] || selectedMember.id,
      currentUser?.["Name"] || currentUser?.name || 'A Peer',
      'team_player'
    );
    
    setEndorsing(false);
    
    if (res.success) {
      setEndorseSuccess('Member endorsed successfully!');
      setTimeout(() => {
        setShowEndorseModal(false);
        setEndorseSuccess('');
        refreshData && refreshData();
      }, 1500);
    } else {
      setEndorseError(res.error || 'Failed to endorse member.');
    }
  };

  const { members = [] } = data;

  // Extract unique classifications and blood groups for filters
  const classifications = Array.from(new Set(members.map(m => m["Classification"]).filter(Boolean)));
  const bloodGroups = Array.from(new Set(members.map(m => m["Blood Group"]).filter(Boolean)));

  // Filter members list
  const filteredMembers = members.filter(m => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      m["Name"].toLowerCase().includes(searchLower) || 
      (m["Classification"] && m["Classification"].toLowerCase().includes(searchLower)) ||
      (m.FamilyMembers && m.FamilyMembers.some(fm => fm.name && fm.name.toLowerCase().includes(searchLower)));
      
    const matchesClassification = !classificationFilter || m["Classification"] === classificationFilter;
    const matchesBlood = !bloodGroupFilter || m["Blood Group"] === bloodGroupFilter;
    
    return matchesSearch && matchesClassification && matchesBlood;
  });

  if (sortBy === 'leaderboard') {
    filteredMembers.sort((a, b) => {
      const aBadges = a.badges ? a.badges.length : 0;
      const bBadges = b.badges ? b.badges.length : 0;
      return bBadges - aBadges || (a["Name"]||'').localeCompare(b["Name"]||'');
    });
  } else {
    filteredMembers.sort((a, b) => (a["Name"]||'').localeCompare(b["Name"]||''));
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Members...</div>;
  }

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header desktop-only">
        <div className="page-title">
          <h1>Member Directory</h1>
          <p className="page-subtitle">{filteredMembers.length} members found</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by name or classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="filter-select"
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
        >
          <option value="">All Classifications</option>
          {classifications.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>

        <select 
          className="filter-select"
          value={bloodGroupFilter}
          onChange={(e) => setBloodGroupFilter(e.target.value)}
        >
          <option value="">All Blood Groups</option>
          {bloodGroups.map((bg, i) => <option key={i} value={bg}>{bg}</option>)}
        </select>
        
        <select 
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="leaderboard">🏆 Leaderboard</option>
        </select>
      </div>

      {/* Members Cards Grid */}
      {filteredMembers.length > 0 ? (
        <>
          {filteredMembers.filter(m => m.Role && m.Role !== 'Member').length > 0 && (
            <>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '24px' }}>Club Leadership Roles</h2>
              <div className="members-grid">
                {filteredMembers
                  .filter(m => m.Role && m.Role !== 'Member')
                  .sort((a, b) => {
                    const idxA = globalRoles.indexOf(a.Role);
                    const idxB = globalRoles.indexOf(b.Role);
                    const rankA = idxA !== -1 ? idxA : 99;
                    const rankB = idxB !== -1 ? idxB : 99;
                    if (rankA !== rankB) return rankA - rankB;
                    return (a.Name || '').localeCompare(b.Name || '');
                  })
                  .map((member) => (
                  <div 
                    key={member["Member ID"]} 
                    className="card member-card"
                    onClick={() => setSelectedMember(member)}
                  >
                    <Avatar member={member} size={60} className="member-avatar-lg" />
                    <div className="member-meta-info">
                      <div className="member-name-text">{member["Name"]}</div>
                      <div className="member-card-role">{member["Role"]}</div>
                      <div className="member-card-phone">
                        {canViewContacts ? member["Mobile"] : <span onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }} style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', cursor: 'pointer'}}><Lock size={12} style={{ color: 'var(--rotary-gold)' }}/> ******</span>}
                      </div>
                      {member["Rotary ID"] && <div className="member-card-rid" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {member["Rotary ID"]}</div>}
                      
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {getDynamicFields(member).map(field => {
                          const isContactField = ['Email', 'Mobile', 'Phone', 'Address', 'Residence Address', 'Office Address', 'Birthday', 'Wedding Anniversary', 'Spouse Name'].includes(field);
                          const displayValue = (!canViewContacts && isContactField) 
                            ? <span onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8', cursor: 'pointer'}}><Lock size={12} style={{ color: 'var(--rotary-gold)' }}/> ******</span>
                            : formatFieldValue(field, member[field], member["Member ID"]);
                          return (
                            <div key={field} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 500 }}>{field}:</span> {displayValue}
                            </div>
                          );
                        })}
                      </div>

                      {chapterSettings?.showRelations && member.FamilyMembers?.some(fm => fm.status === 'approved') && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>RELATIONS</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {canViewContacts ? (
                              member.FamilyMembers.filter(fm => fm.status === 'approved').map((fm, idx) => (
                                <div key={idx} style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--rotary-gold)' }}></div>
                                  {fm.name} <span style={{ opacity: 0.6 }}>({fm.relation})</span>
                                </div>
                              ))
                            ) : (
                              <div onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }} style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <Lock size={10} style={{ color: 'var(--rotary-gold)' }} /> ******
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredMembers.filter(m => !m.Role || m.Role === 'Member').length > 0 && (
            <>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '24px' }}>Members</h2>
              <div className="members-grid">
                {filteredMembers.filter(m => !m.Role || m.Role === 'Member').map((member) => (
                  <div 
                    key={member["Member ID"]} 
                    className="card member-card"
                    onClick={() => setSelectedMember(member)}
                  >
                    <Avatar member={member} size={60} className="member-avatar-lg" />
                    <div className="member-meta-info">
                      <div className="member-name-text">{member["Name"]}</div>
                      <div className="member-card-role">{member["Role"]}</div>
                      <div className="member-card-phone">
                        {canViewContacts ? member["Mobile"] : <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8'}}><Lock size={12}/> +91 ******</span>}
                      </div>
                      {member["Rotary ID"] && <div className="member-card-rid" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {member["Rotary ID"]}</div>}
                      
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {getDynamicFields(member).map(field => (
                          <div key={field} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>{field}:</span> {formatFieldValue(field, member[field], member["Member ID"])}
                          </div>
                        ))}
                      </div>

                      {chapterSettings?.showRelations && member.FamilyMembers?.some(fm => fm.status === 'approved') && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>RELATIONS</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {member.FamilyMembers.filter(fm => fm.status === 'approved').map((fm, idx) => (
                              <div key={idx} style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--rotary-gold)' }}></div>
                                {fm.name} <span style={{ opacity: 0.6 }}>({fm.relation})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Info size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>No members found matching the current search filters.</p>
        </div>
      )}

      {/* MEMBER DETAIL DRAWER/SLIDE-OVER */}
      {selectedMember && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedMember(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-bar">
              <button className="drawer-back-btn" onClick={() => setSelectedMember(null)} title="Back">
                <ArrowLeft size={20} color="white" />
              </button>
              <div className="drawer-header-actions">
                {isPST && (
                  <>
                  <button className="drawer-edit-btn" style={{ marginRight: "8px", background: "var(--rotary-blue)" }} onClick={() => { 
                    setEditProfileForm({
                      Mobile: selectedMember.Mobile || "",
                      Email: selectedMember.Email || "",
                      "Blood Group": selectedMember["Blood Group"] || "",
                      Birthday: selectedMember.Birthday || "",
                      Anniversary: selectedMember.Anniversary || "",
                      CompanyName: selectedMember.CompanyName || "",
                      Industry: selectedMember.Industry || "",
                      BusinessDesignation: selectedMember.BusinessDesignation || ""
                    });
                    setShowEditProfileModal(true);
                  }} title="Edit Profile">
                    <Edit2 size={16} color="white" />
                  </button>

                  <button className="drawer-edit-btn" onClick={async () => { 
                    setEditRole(selectedMember["Role"]); 
                    setShowEditModal(true); 
                    setFetchingPayments(true);
                    setDuesAction('none');
                    setDeletionNotes('');
                    setPendingPayments([]);
                    const targetMemberId = selectedMember["Member ID"] || selectedMember.id;
                    const res = await api.getMemberPayments(targetMemberId);
                    if (res.success) {
                      setPendingPayments(res.pending || []);
                      if (res.pending && res.pending.length > 0) setDuesAction('cleared');
                    }
                    setFetchingPayments(false);
                  }} title="Settings">
                    <Settings size={20} color="white" />
                  </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="member-detail-header">
              {isBirthdayToday(selectedMember["Birthday"]) && (
                <div style={{ width: '100%', background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px' }}>
                  🎉 Happy Birthday, {selectedMember["Name"].split(' ')[0]}! 🎂
                </div>
              )}
              <div className="member-detail-avatar-wrapper">
                <Avatar member={selectedMember} size={100} className="member-detail-avatar" />
              </div>
              <h2 className="member-detail-name">{selectedMember["Name"]}</h2>
              <span className="member-detail-role">{selectedMember["Role"]}</span>
            </div>

            {/* Direct Dial / Message / Email triggers */}
            <div className="member-detail-actions">
              <a 
                href={canViewContacts ? `tel:${selectedMember.Mobile}` : '#'}
                onClick={(e) => { if (!canViewContacts) { e.preventDefault(); setShowUpgradeModal(true); } }}
                className="contact-action-btn"
              >
                <div className="contact-action-icon">
                  {canViewContacts ? <Phone size={20} /> : <Lock size={20} />}
                </div>
                <span>Call</span>
              </a>
              <a 
                href={canViewContacts ? `https://wa.me/91${selectedMember["Mobile"]}?text=Hi%20${encodeURIComponent(selectedMember["Name"])}` : '#'} 
                onClick={(e) => { if (!canViewContacts) { e.preventDefault(); setShowUpgradeModal(true); } }}
                target="_blank" 
                rel="noreferrer" 
                className="contact-action-btn"
              >
                <div className="contact-action-icon">
                  {canViewContacts ? <MessageCircle size={20} /> : <Lock size={20} />}
                </div>
                <span>Message</span>
              </a>
              <a 
                href={canViewContacts ? `mailto:${selectedMember.Email}` : '#'} 
                onClick={(e) => { if (!canViewContacts) { e.preventDefault(); setShowUpgradeModal(true); } }}
                className="contact-action-btn"
              >
                <div className="contact-action-icon">
                  {canViewContacts ? <Mail size={20} /> : <Lock size={20} />}
                </div>
                <span>Email</span>
              </a>
            </div>

            {/* Profile Fields List */}
            <div className="member-detail-fields-card">
              <div className="detail-field-row">
                <span className="detail-field-label">Rotary ID</span>
                <span className="detail-field-value">{selectedMember["Rotary ID"] || "Not Specified"}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Phone</span>
                <span className="detail-field-value">
                  {canViewContacts ? selectedMember["Mobile"] : <span onClick={(e) => { e.preventDefault(); setShowUpgradeModal(true); }} style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', cursor: 'pointer'}}><Lock size={12} style={{ color: 'var(--rotary-gold)' }}/> ******</span>}
                </span>
              </div>
              
              {/* Dynamic Non-System Fields */}
              {Object.keys(selectedMember)
                .filter(k => !systemFields.includes(k))
                .sort(sortFields)
                .map(field => {
                  const isContactField = ['Email', 'Mobile', 'Phone', 'Address', 'Residence Address', 'Office Address', 'Birthday', 'Wedding Anniversary', 'Spouse Name'].includes(field);
                  const displayValue = (!canViewContacts && isContactField) 
                    ? <span onClick={(e) => { e.preventDefault(); setShowUpgradeModal(true); }} style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', cursor: 'pointer'}}><Lock size={12} style={{ color: 'var(--rotary-gold)' }}/> ******</span>
                    : formatFieldValue(field, selectedMember[field] || "Not Specified", selectedMember["Member ID"]);
                    
                  return (
                    <div className="detail-field-row" key={field}>
                      <span className="detail-field-label">{field}</span>
                      <span className="detail-field-value" style={field === 'Email' ? { wordBreak: 'break-all' } : {}}>{displayValue}</span>
                    </div>
                  );
                })}
              
              {selectedMember.FamilyMembers?.some(fm => fm.status === 'approved') && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Family members</h4>
                  {canViewContacts ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {selectedMember.FamilyMembers.filter(fm => fm.status === 'approved').map((fm, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            background: '#ffffff', 
                            border: '1px solid var(--border-color)', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            width: '80px', 
                            textAlign: 'center',
                          }}
                        >
                          <Avatar member={members?.find(m => m["Member ID"] === fm.id) || { Name: fm.name }} size={48} />
                          <div style={{ marginTop: '8px', width: '100%' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px', lineHeight: '1.2' }}>{typeof fm.name === 'object' ? fm.name?.name || JSON.stringify(fm.name) : fm.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{fm.relation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div onClick={(e) => { e.preventDefault(); setShowUpgradeModal(true); }} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer'}}>
                      <Lock size={16} style={{ color: 'var(--rotary-gold)' }}/>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>******</span>
                    </div>
                  )}
                </div>
              )}

              {/* Peer Badges & Endorsements */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                {isBirthdayToday(selectedMember["Birthday"]) && (
                    <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', margin: '-24px -24px 20px -24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      🎉 Happy Birthday, {selectedMember["Name"].split(' ')[0]}! 🎂
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Badges & Endorsements</h4>
                  {selectedMember["Member ID"] !== currentUser["Member ID"] && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '12px', height: 'auto' }}
                      onClick={() => setShowEndorseModal(true)}
                    >
                      + Endorse
                    </button>
                  )}
                </div>
                
                {(() => {
                  if (selectedMember.badges && selectedMember.badges.length > 0) {
                    const groupedBadgesMap = selectedMember.badges.reduce((acc, badge) => {
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

                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {uniqueBadges.map((badge, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedBadgeForDates(badge)}
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              background: '#ffffff', 
                              border: '1px solid var(--border-color)', 
                              padding: '12px', 
                              borderRadius: '8px', 
                              width: '80px', 
                              textAlign: 'center',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            {badge.count > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: 'var(--rotary-gold)',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                zIndex: 10
                              }}>
                                {badge.count}
                              </div>
                            )}
                            {badge.image ? (
                              <img 
                                src={badge.image} 
                                alt={badge.name} 
                                style={{ width: '56px', height: '56px', marginBottom: '8px', objectFit: 'contain' }} 
                              />
                            ) : (
                              <div style={{
                                width: '56px', height: '56px', borderRadius: '50%', background: 'var(--rotary-gold)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '8px'
                              }}>
                                <Award size={28} />
                              </div>
                            )}
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px', lineHeight: '1.2' }}>
                              {typeof badge.name === 'object' ? badge.name?.name || JSON.stringify(badge.name) : badge.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No badges earned yet.</p>;
                  }
                })()}
                
                {/* Endorsements List */}
                {selectedMember.endorsements && selectedMember.endorsements.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Endorsements from Peers</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedMember.endorsements.map((endors, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                          <span style={{ fontWeight: 600 }}>{typeof endors.endorserName === 'object' ? 'A Peer' : (endors.endorserName || 'A Peer')}</span> endorsed for <span style={{ fontWeight: 600, color: 'var(--rotary-blue)' }}>Team Player</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ENDORSE MODAL */}
      <Modal
        isOpen={showEndorseModal && !!selectedMember}
        onClose={() => setShowEndorseModal(false)}
        title="Endorse Member"
        subtitle={selectedMember?.["Name"]}
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Would you like to endorse <strong>{selectedMember?.["Name"]}</strong> as a Team Player?
        </p>

        {endorseError && <p className="error" style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--error)' }}>{endorseError}</p>}
        {endorseSuccess && <p className="success" style={{ marginBottom: '16px', fontSize: '13px', color: 'green' }}>{endorseSuccess}</p>}

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginBottom: '10px' }} 
          onClick={handleEndorseMember}
          disabled={endorsing || endorseSuccess}
        >
          {endorsing ? 'Endorsing...' : 'Endorse as Team Player'}
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%' }} 
          onClick={() => setShowEndorseModal(false)}
        >
          Cancel
        </button>
      </Modal>

      {/* EDIT MODAL (President Only) */}
      <Modal
        isOpen={showEditModal && !!selectedMember}
        onClose={() => setShowEditModal(false)}
        title="Manage Member"
        subtitle={selectedMember?.["Name"]}
      >
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Role</label>
          <select className="input-field" value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="Member">Member</option>
            {globalRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '30px' }} onClick={handleRoleChange}>
          Update Role
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

        <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>Propose Deletion</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Requires 2 additional core member approvals to delete/orphan this member.
        </p>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <textarea 
            className="input-field" 
            placeholder="Reason for deletion..." 
            rows="3"
            value={deletionNotes}
            onChange={(e) => setDeletionNotes(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {fetchingPayments ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Checking pending dues...</p>
        ) : pendingPayments.length > 0 ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--error)', margin: '0 0 8px 0', fontSize: '14px' }}>Pending Dues Detected ({pendingPayments.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="dues" checked={duesAction === 'cleared'} onChange={() => setDuesAction('cleared')} />
                Confirm dues cleared externally
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="dues" checked={duesAction === 'waiver_requested'} onChange={() => setDuesAction('waiver_requested')} />
                Request dues waiver from approvers
              </label>
            </div>
          </div>
        ) : null}

        <button className="btn" style={{ width: '100%', background: '#ef4444', color: 'white', marginTop: '10px', padding: '12px', border: 'none', borderRadius: '6px' }} onClick={handleProposeDeletion}>
          Submit Deletion Request
        </button>

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowEditModal(false)}>
          Cancel
        </button>
      </Modal>

      <Modal isOpen={!!selectedBadgeForDates} onClose={() => setSelectedBadgeForDates(null)} title={selectedBadgeForDates ? `${selectedBadgeForDates.name} Earned Dates` : ''} zIndex={10000}>
        <div style={{ padding: '20px' }}>
          {selectedBadgeForDates?.dates && selectedBadgeForDates.dates.length > 0 ? (
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

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          setActiveTab('subscription');
        }}
      />
    </div>
  );
};
