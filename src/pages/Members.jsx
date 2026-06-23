import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Phone, MessageCircle, Mail, X, Info, ArrowLeft, Edit2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Papa from 'papaparse';
import { Avatar } from '../components/Avatar';
import './pages.css';

export const Members = ({ data, loading, refreshData }) => {
  const { isPresident, currentUser, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [deletionNotes, setDeletionNotes] = useState('');
  const [pendingPayments, setPendingPayments] = useState([]);
  const [duesAction, setDuesAction] = useState('none');
  const [fetchingPayments, setFetchingPayments] = useState(false);

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

  const { members = [] } = data;

  // Extract unique classifications and blood groups for filters
  const classifications = Array.from(new Set(members.map(m => m["Classification"]).filter(Boolean)));
  const bloodGroups = Array.from(new Set(members.map(m => m["Blood Group"]).filter(Boolean)));

  // Filter members list
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m["Name"].toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m["Classification"] && m["Classification"].toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesClassification = !classificationFilter || m["Classification"] === classificationFilter;
    const matchesBlood = !bloodGroupFilter || m["Blood Group"] === bloodGroupFilter;
    
    return matchesSearch && matchesClassification && matchesBlood;
  });

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
      </div>

      {/* Members Cards Grid */}
      {filteredMembers.length > 0 ? (
        <div className="members-grid">
          {filteredMembers.map((member) => (
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
              </div>
            </div>
          ))}
        </div>
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
                <ArrowLeft size={24} color="white" />
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
                  }} title="Manage Member">
                    <Edit2 size={18} />
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
                <span className="detail-field-label">Phone</span>
                <span className="detail-field-value">{selectedMember["Mobile"]}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Email</span>
                <span className="detail-field-value" style={{ wordBreak: 'break-all' }}>{selectedMember["Email"]}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Classification</span>
                <span className="detail-field-value">{selectedMember["Classification"] || "Not Specified"}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Blood Group</span>
                <span className="detail-field-value">{selectedMember["Blood Group"] || "Not Specified"}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Birthday</span>
                <span className="detail-field-value">{selectedMember["Birthday"] || "Not Specified"}</span>
              </div>
              <div className="detail-field-row">
                <span className="detail-field-label">Anniversary</span>
                <span className="detail-field-value">{selectedMember["Anniversary"] || "Not Specified"}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MODAL (President Only) */}
      {showEditModal && selectedMember && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Manage Member</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{selectedMember["Name"]}</p>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Role</label>
              <select className="input-field" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="Member">Member</option>
                <option value="President">President</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
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
            <div className="form-group">
              <textarea 
                className="input-field" 
                placeholder="Reason for deletion..." 
                rows="3"
                value={deletionNotes}
                onChange={(e) => setDeletionNotes(e.target.value)}
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
            ) : (
              <p style={{ color: 'var(--success)', margin: '0 0 16px 0', fontSize: '13px', fontWeight: 'bold' }}>No pending dues. Safe to remove.</p>
            )}

            <button className="btn" style={{ width: '100%', background: '#ef4444', color: 'white', marginTop: '10px' }} onClick={handleProposeDeletion}>
              Submit Deletion Request
            </button>

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowEditModal(false)}>
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
