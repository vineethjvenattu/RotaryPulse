import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Save, Edit2, X, Check, FileText } from 'lucide-react';
import { Modal } from '../components/Modal';
import './pages.css';

export function ClubDetails() {
  const { currentUser, isPresident, isSecretary, isTreasurer, globalConfig } = useAuth();
  const [details, setDetails] = useState({});
  const [pendingEdits, setPendingEdits] = useState([]);
  const [approvedEdits, setApprovedEdits] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  
  const isPST = isPresident || isSecretary || isTreasurer;

  useEffect(() => {
    if (currentUser?.chapterId) {
      fetchData();
    }
  }, [currentUser]);

  const getChangedFields = (newData, oldData = details) => {
    const changes = [];
    const allKeys = new Set([...Object.keys(newData || {}), ...Object.keys(oldData || {})]);
    for (let key of allKeys) {
      if (String(newData[key] || '') !== String(oldData[key] || '')) {
        changes.push({ key, old: oldData[key], new: newData[key] });
      }
    }
    return changes;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const detailsRes = await api.getClubDetails(currentUser.chapterId);
      if (detailsRes.success) {
        setDetails(detailsRes.data || {});
        setFormData(detailsRes.data || {});
      }
      if (isPST) {
        const editsRes = await api.getPendingClubDetailsEdits(currentUser.chapterId);
        if (editsRes.success) {
          setPendingEdits(editsRes.data);
        }
      }
      
      const approvedRes = await api.getApprovedClubDetailsEdits(currentUser.chapterId);
      if (approvedRes.success) {
        setApprovedEdits(approvedRes.data);
      }
      
      const membersRes = await api.getChapterMembers(currentUser.chapterId);
      if (membersRes.success) {
        setMembers(membersRes.members || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPST) return;
    setSaving(true);
    
    try {
      // Get PST members for required approvers
      const COMMITTEE_ROLES = globalConfig?.coreCommitteeRoles || ['President', 'Secretary', 'Treasurer'];
      const membersRes = await api.getChapterMembers(currentUser.chapterId);
      let pstMembers = [];
      if (membersRes.success) {
        pstMembers = membersRes.members
          .filter(m => {
            const mRole = m["Role"] ? String(m["Role"]).trim().toLowerCase() : "";
            return ['president', 'secretary', 'treasurer'].includes(mRole) && m["Member ID"] !== currentUser["Member ID"];
          })
          .map(m => m["Member ID"]);
      }

      const res = await api.requestClubDetailsEdit(currentUser.chapterId, formData, currentUser, pstMembers);
      
      if (res.success) {
        alert("Proposed changes have been submitted for approval.");
        setIsEditing(false);
        fetchData();
      } else {
        alert("Failed to submit changes: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (editId) => {
    const res = await api.approveClubDetailsEdit(currentUser.chapterId, editId, currentUser);
    if (res.success) {
      if (res.isApproved) {
        alert("Changes approved and applied successfully.");
      } else {
        alert("Your approval has been recorded. Waiting for others.");
      }
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleReject = async (editId) => {
    if (!window.confirm("Are you sure you want to reject this proposed change?")) return;
    const res = await api.rejectClubDetailsEdit(currentUser.chapterId, editId);
    if (res.success) {
      alert("Proposed change rejected.");
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading Club Details...</div>;
  }

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header desktop-only">
        <div className="page-title">
          <h1>Club Details & Bylaws</h1>
          <p className="page-subtitle">View and manage your club's rules and details</p>
        </div>
      </div>

      <div className="dashboard-mobile-banner">
        <span className="dashboard-greeting-label">Club Details & Bylaws</span>
        <h2 className="dashboard-greeting-name">View club information</h2>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col" style={{ flex: 2 }}>
          {isPST && pendingEdits.length > 0 && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--rotary-gold)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Pending Proposed Changes</h3>
              {pendingEdits.map(edit => (
                <div key={edit.id} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600 }}>Proposed by: {edit["Proposed By Name"]}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(edit["Timestamp"]).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '16px', fontSize: '14px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '8px' }}>Proposed Changes:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {getChangedFields(edit["Data"]).map(change => (
                        <div key={change.key} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{change.key}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', wordBreak: 'break-word' }}>
                            <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--error)' }}>
                              {String(change.old || 'none')}
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>→</div>
                            <div style={{ flex: 1, color: 'var(--success)' }}>
                              {String(change.new || 'none')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getChangedFields(edit["Data"]).length === 0 && (
                        <div style={{ color: 'var(--text-secondary)' }}>No changes detected</div>
                      )}
                    </div>
                  </div>

                  {edit["Approvals"]?.includes(currentUser["Member ID"]) ? (
                    <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: '6px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} /> Approved by you (waiting for other PST members)
                    </div>
                  ) : edit["Proposed By"] !== currentUser["Member ID"] ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleApprove(edit.id)}>
                        <Check size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Approve
                      </button>
                      <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handleReject(edit.id)}>
                        <X size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Waiting for other committee members to approve...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={24} color="var(--rotary-blue)" />
                <h2 style={{ margin: 0, color: 'var(--rotary-blue-dark)' }}>Club Details</h2>
              </div>
              {isPST && !isEditing && (
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} style={{ marginRight: '6px' }} /> Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Monthly Fees</label>
                  <input type="text" className="form-control" name="monthlyFees" value={formData.monthlyFees || ''} onChange={handleChange} placeholder="e.g. ₹1500" />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Fees</label>
                  <input type="text" className="form-control" name="joiningFees" value={formData.joiningFees || ''} onChange={handleChange} placeholder="e.g. ₹5000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Details</label>
                  <textarea className="form-control" name="bankDetails" value={formData.bankDetails || ''} onChange={handleChange} rows="3" placeholder="Account Name, Number, IFSC..." />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input type="text" className="form-control" name="upiId" value={formData.upiId || ''} onChange={handleChange} placeholder="e.g. rotary@upi" />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Instructions</label>
                  <textarea className="form-control" name="joiningInstructions" value={formData.joiningInstructions || ''} onChange={handleChange} rows="3" placeholder="Instructions for new members..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Facebook Page ID</label>
                  <input type="text" className="form-control" name="fbPageId" value={formData.fbPageId || ''} onChange={handleChange} placeholder="e.g. 1150988591438674" />
                </div>
                <div className="form-group">
                  <label className="form-label">Facebook Access Token</label>
                  <input type="password" className="form-control" name="fbAccessToken" value={formData.fbAccessToken || ''} onChange={handleChange} placeholder="Long-lived Page Access Token" />
                </div>
                <div className="form-group">
                  <label className="form-label">Facebook Token Expiry Date</label>
                  <input type="date" className="form-control" name="fbTokenExpiryDate" value={formData.fbTokenExpiryDate || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Club Bylaws</label>
                  <textarea className="form-control" name="bylaws" value={formData.bylaws || ''} onChange={handleChange} rows="8" placeholder="Enter full bylaws here..." />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Submitting...' : <><Save size={16} style={{ marginRight: '6px' }} /> Propose Changes</>}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); setFormData(details); }} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="details-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="detail-section">
                  <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fees</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Fees</div>
                      <div style={{ fontWeight: 600 }}>{details.monthlyFees || 'Not specified'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Joining Fees</div>
                      <div style={{ fontWeight: 600 }}>{details.joiningFees || 'Not specified'}</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>UPI ID</div>
                      <div style={{ fontWeight: 600 }}>{details.upiId || 'Not specified'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bank Details</div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{details.bankDetails || 'Not specified'}</div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Social Integrations</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Facebook Page ID</div>
                      <div style={{ fontWeight: 600 }}>{details.fbPageId || 'Not configured'}</div>
                    </div>
                    {isPST && (
                      <>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Facebook Access Token</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>{details.fbAccessToken ? '••••••••••••••••' : 'Not configured'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Token Expiry Date</div>
                          <div style={{ fontWeight: 600, color: details.fbTokenExpiryDate && new Date(details.fbTokenExpiryDate) < new Date(new Date().setDate(new Date().getDate() + 10)) ? 'var(--error)' : 'var(--text-primary)' }}>
                            {details.fbTokenExpiryDate ? new Date(details.fbTokenExpiryDate).toLocaleDateString() : 'Not configured'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joining Instructions</h4>
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {details.joiningInstructions || 'No instructions provided.'}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Club Bylaws</h4>
                  <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6, border: '1px solid var(--border-color)' }}>
                    {details.bylaws || 'No bylaws have been documented yet.'}
                  </div>
                </div>
              </div>
            )}
            
            {/* VERSION HISTORY */}
            {!isEditing && approvedEdits.length > 0 && (
              <div className="card" style={{ marginTop: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Version History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {approvedEdits.map((edit, idx) => (
                    <div key={edit.id} style={{ 
                      padding: '16px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px', 
                      borderLeft: idx === 0 ? '3px solid var(--success)' : '3px solid var(--border-color)',
                      opacity: idx === 0 ? 1 : 0.8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {idx === 0 ? 'Latest Approved Version' : 'Previous Version'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(edit["Timestamp"]).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Proposed by {edit["Proposed By Name"]} 
                        <br/>
                        Approved by {edit["Approvals"]?.length > 0 ? edit["Approvals"].map(id => {
                          const m = members.find(member => member["Member ID"] === id);
                          return m ? m.Name : id;
                        }).join(", ") : "Admin"}
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedVersion({
                          edit,
                          oldData: idx < approvedEdits.length - 1 ? approvedEdits[idx + 1]["Data"] : {}
                        })}>
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedVersion}
        onClose={() => setSelectedVersion(null)}
        title="Version Details"
      >
        {selectedVersion && (
          <>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px' }}>
              <div style={{ marginBottom: '4px' }}><strong>Date:</strong> {new Date(selectedVersion.edit["Timestamp"]).toLocaleString()}</div>
              <div style={{ marginBottom: '4px' }}><strong>Proposed By:</strong> {selectedVersion.edit["Proposed By Name"]}</div>
              <div><strong>Approved By:</strong> {selectedVersion.edit["Approvals"]?.length > 0 ? selectedVersion.edit["Approvals"].map(id => {
                const m = members.find(member => member["Member ID"] === id);
                return m ? m.Name : id;
              }).join(", ") : "Admin"}</div>
            </div>
            <h4 style={{ marginBottom: '12px', marginTop: '24px' }}>Changed Fields</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getChangedFields(selectedVersion.edit["Data"], selectedVersion.oldData).map(change => (
                <div key={change.key} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>{change.key}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', wordBreak: 'break-word' }}>
                    <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--error)' }}>
                      {String(change.old || 'none')}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>→</div>
                    <div style={{ flex: 1, color: 'var(--success)' }}>
                      {String(change.new || 'none')}
                    </div>
                  </div>
                </div>
              ))}
              {getChangedFields(selectedVersion.edit["Data"], selectedVersion.oldData).length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '14px' }}>No fields were modified in this version.</div>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
