import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Phone, MessageCircle, Mail, X, Info, ArrowLeft, Edit2, AlertCircle, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Papa from 'papaparse';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import './pages.css';

export const Members = ({ data, loading, refreshData }) => {
  const { isPresident, currentUser, role } = useAuth();
  const [chapterSettings, setChapterSettings] = useState(null);
  const [globalRoles, setGlobalRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
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
    if (currentUser?.chapterId) {
      api.getChapterData(currentUser.chapterId).then(res => {
        if (res.success) setChapterSettings(res.data);
      });
    }
    api.getGlobalConfig().then(res => {
      if (res.success) setGlobalRoles(res.config.roles || []);
    });
  }, [currentUser]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Members...</div>;
  }

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

  const systemFields = ['id', 'chapterId', 'Pin', 'status', 'SearchName', 'Name', 'Role', 'Mobile', 'Member ID', 'Rotary ID', 'hasPin', 'FamilyMembers', 'Designations', 'badges', 'endorsements'];
  
  const standardFieldOrder = ["Gender", "Birthday", "Blood Group", "Spouse Name", "Email", "Address", "Profession", "Classification"];
  
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
      return bBadges - aBadges || a["Name"].localeCompare(b["Name"]);
    });
  } else {
    filteredMembers.sort((a, b) => a["Name"].localeCompare(b["Name"]));
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
                      <div className="member-card-phone">{member["Mobile"]}</div>
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
                      <div className="member-card-phone">{member["Mobile"]}</div>
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
                {isPresident && (
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
                  }} title="Edit Member Profile">
                    <Edit2 size={16} color="white" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="member-detail-header">
              <div className="member-detail-avatar-wrapper">
                <Avatar member={selectedMember} size={100} className="member-detail-avatar" />
              </div>
              <h2 className="member-detail-name">{selectedMember["Name"]}</h2>
              <span className="member-detail-role">{selectedMember["Role"]}</span>
            </div>

            {/* Direct Dial / Message / Email triggers */}
            <div className="member-detail-actions">
              <a href={`tel:${selectedMember["Mobile"]}`} className="contact-action-btn">
                <div className="contact-action-icon">
                  <Phone size={20} />
                </div>
                <span>Call</span>
              </a>
              <a 
                href={`https://wa.me/91${selectedMember["Mobile"]}?text=Hi%20${encodeURIComponent(selectedMember["Name"])}`} 
                target="_blank" 
                rel="noreferrer" 
                className="contact-action-btn"
              >
                <div className="contact-action-icon">
                  <MessageCircle size={20} />
                </div>
                <span>Message</span>
              </a>
              <a href={`mailto:${selectedMember["Email"]}`} className="contact-action-btn">
                <div className="contact-action-icon">
                  <Mail size={20} />
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
                <span className="detail-field-value">{selectedMember["Mobile"]}</span>
              </div>
              
              {/* Dynamic Non-System Fields */}
              {Object.keys(selectedMember)
                .filter(k => !systemFields.includes(k))
                .sort(sortFields)
                .map(field => (
                  <div className="detail-field-row" key={field}>
                    <span className="detail-field-label">{field}</span>
                    <span className="detail-field-value" style={field === 'Email' ? { wordBreak: 'break-all' } : {}}>{formatFieldValue(field, selectedMember[field] || "Not Specified", selectedMember["Member ID"])}</span>
                  </div>
              ))}
              
              {selectedMember.FamilyMembers?.some(fm => fm.status === 'approved') && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Approved Relations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedMember.FamilyMembers.filter(fm => fm.status === 'approved').map((fm, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{fm.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fm.relation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peer Badges & Endorsements */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
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
                                style={{ width: '40px', height: '40px', marginBottom: '8px', objectFit: 'contain' }} 
                              />
                            ) : (
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--rotary-gold)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '8px'
                              }}>
                                <Award size={20} />
                              </div>
                            )}
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px', lineHeight: '1.2' }}>
                              {badge.name}
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
    </div>
  );
};
