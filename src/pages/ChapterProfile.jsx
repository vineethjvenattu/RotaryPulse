import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import Papa from 'papaparse';
import { Avatar } from '../components/Avatar';
import { Users, Upload, Download, ArrowLeft, UserCircle, Save, Plus, X } from 'lucide-react';
import './pages.css';

export function ChapterProfile({ chapterId, chapterName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [globalRoles, setGlobalRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Assign Role Modal state
  const [assigningRole, setAssigningRole] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Removal state
  const [removingMember, setRemovingMember] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [duesAction, setDuesAction] = useState('none');
  const [removalNotes, setRemovalNotes] = useState('');
  const [fetchingPayments, setFetchingPayments] = useState(false);
  const [proposingRemoval, setProposingRemoval] = useState(false);

  const initiateRemoval = async (member) => {
    setRemovingMember(member);
    setFetchingPayments(true);
    setDuesAction('none');
    setRemovalNotes('');
    const res = await api.getMemberPayments(member["Member ID"]);
    if (res.success) {
      setPendingPayments(res.pending);
      if (res.pending.length > 0) setDuesAction('cleared');
    }
    setFetchingPayments(false);
  };

  const handleProposeRemoval = async () => {
    if (!removalNotes.trim()) return alert("Please provide a reason.");
    setProposingRemoval(true);
    const res = await api.proposeMemberDeletion(chapterId, removingMember["Member ID"], removalNotes, 'Admin', duesAction);
    setProposingRemoval(false);
    if (res.success) {
      alert("Removal proposed. Pending President, Secretary, and Treasurer approvals.");
      setRemovingMember(null);
    } else {
      alert("Error: " + res.error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chapterId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch global roles
    const rolesRes = await api.getGlobalRoles();
    if (rolesRes.success) {
      setGlobalRoles(rolesRes.roles);
    }
    // Fetch members for this chapter
    const memRes = await api.getChapterMembers(chapterId);
    if (memRes.success) {
      const sortedMembers = [...memRes.members].sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
      setMembers(sortedMembers);
    }
    setLoading(false);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/template.csv';
    link.download = 'rotary_member_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawHeaders = results.meta.fields || [];
          const headers = rawHeaders.map(h => h.trim());
          
          const expectedHeaders = [
            "Sl No", "Name", "Rotary ID", "Gender", "Address", "Mobile No", "Profession", "Spouse Name", "E-mail", "DOB"
          ];

          const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            setUploadStatus({
              success: false,
              message: `Invalid CSV format. Missing columns: ${missingHeaders.join(", ")}. Please download and use the official template.`
            });
            setUploading(false);
            e.target.value = '';
            return;
          }

          const formattedMembers = results.data
            .filter(row => row['Name'] && row['Name'].trim() !== '')
            .map(row => {
              const nameStr = row['Name'] ? row['Name'].trim() : '';
              const rId = row['Rotary ID'] ? row['Rotary ID'].trim() : '';
              
              let email = row['E-mail'] ? row['E-mail'].trim() : '';
              const mobile = row['Mobile No'] ? row['Mobile No'].trim() : '';
              
              let memberId = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              if (rId) memberId = rId;

              if (!email) {
                email = `${memberId}@rotary.org`;
              }

              const resultRow = {
                "Member ID": memberId,
                "Name": nameStr,
                "Name (Rotary ID)": rId ? `${nameStr} (${rId})` : nameStr,
                "Email": email.toLowerCase(),
              };

              if (row['Gender'] && row['Gender'].trim()) resultRow["Gender"] = row['Gender'].trim();
              if (mobile) resultRow["Mobile"] = mobile;
              if (row['Address'] && row['Address'].trim()) resultRow["Address"] = row['Address'].trim();
              if (row['Profession'] && row['Profession'].trim()) resultRow["Profession"] = row['Profession'].trim();
              if (row['Spouse Name'] && row['Spouse Name'].trim()) resultRow["Spouse Name"] = row['Spouse Name'].trim();
              if (row['DOB'] && row['DOB'].trim()) resultRow["DOB"] = row['DOB'].trim();

              return resultRow;
          });

          if (formattedMembers.length === 0) {
             setUploadStatus({ success: false, message: 'No valid members found in CSV.' });
             setUploading(false);
             return;
          }

          const res = await api.bulkUploadMembers(chapterId, formattedMembers);
          if (res.success) {
            setUploadStatus({ success: true, message: `Successfully imported ${res.count} members.` });
            await fetchData(); // Refresh list
          } else {
            setUploadStatus({ success: false, message: res.error || 'Upload failed' });
          }
        } catch (error) {
          setUploadStatus({ success: false, message: 'Error processing CSV' });
        }
        setUploading(false);
        e.target.value = '';
      },
      error: () => {
        setUploadStatus({ success: false, message: 'Failed to read CSV file' });
        setUploading(false);
        e.target.value = '';
      }
    });
  };

  const handleAssignRole = async () => {
    if (!assigningRole || !selectedMemberId) return;
    
    setLoading(true);
    const res = await api.assignChapterRole(chapterId, selectedMemberId, assigningRole);
    if (res.success) {
      await fetchData();
    } else {
      alert("Error assigning role: " + res.error);
    }
    
    setAssigningRole(null);
    setSelectedMemberId('');
    setLoading(false);
  };

  if (loading) {
    return <div className="loading-spinner" style={{ margin: '40px auto', display: 'block', width: '40px', height: '40px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--rotary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>;
  }

  // Get current mapping of Roles to Members
  const roleMapping = {};
  globalRoles.forEach(role => {
    roleMapping[role] = members.find(m => m.Role === role) || null;
  });

  return (
    <div className="chapter-profile animate-fade-in" style={{ padding: '20px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--rotary-blue-dark)', fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>{chapterName}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Total Members: {members.length}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Template
          </button>
          
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} /> {uploading ? 'Importing...' : 'Import CSV'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {uploadStatus && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: uploadStatus.success ? 'var(--success-light)' : 'var(--error-light)',
          color: uploadStatus.success ? 'var(--success)' : 'var(--error)',
          fontSize: '14px',
          fontWeight: 500
        }}>
          {uploadStatus.message}
          {!uploadStatus.success && uploadStatus.message.includes("Invalid CSV format") && (
            <div style={{ marginTop: '8px' }}>
              <button onClick={handleDownloadTemplate} style={{ background: 'none', border: 'none', color: 'var(--error)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                Click here to download the correct template
              </button>
            </div>
          )}
        </div>
      )}

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Chapter Leadership Roles</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {globalRoles.map(role => {
          const occupant = roleMapping[role];
          return (
            <div key={role} style={{ 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: '20px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: 600 }}>{role}</h4>
              
              {occupant ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--rotary-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600 }}>
                    {occupant.Name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--rotary-blue-dark)', fontSize: '16px' }}>{occupant.Name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{occupant.Email}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', opacity: 0.5 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCircle size={24} />
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Unassigned</div>
                </div>
              )}

              <button 
                className="btn btn-secondary" 
                style={{ marginTop: 'auto', padding: '8px 12px', fontSize: '13px' }}
                onClick={() => {
                  setAssigningRole(role);
                  setSelectedMemberId(occupant ? occupant["Member ID"] : '');
                }}
              >
                {occupant ? 'Change Assignment' : 'Assign Role'}
              </button>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>All Chapter Members</h3>
      
      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
          <Users size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px', opacity: 0.5 }} />
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>No Members Found</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>This chapter has no members yet. Use the Import CSV button above to add members.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>Name & Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m["Member ID"]} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar member={m} size={28} className="chapter-member-avatar" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.Name}
                        {m.Role && m.Role !== 'Member' && (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: 700,
                            backgroundColor: 'var(--rotary-blue)',
                            color: 'white',
                            display: 'inline-block'
                          }}>
                            {m.Role}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{m.Email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => initiateRemoval(m)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ASSIGN ROLE MODAL */}
      {assigningRole && createPortal(
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <button className="drawer-close" onClick={() => setAssigningRole(null)}><X size={24} /></button>
            <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>Assign {assigningRole}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select a member from this chapter to assign to the role of <strong>{assigningRole}</strong>. 
              If they hold another role, they will be replaced.
            </p>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Select Member</label>
              <select 
                className="form-input" 
                value={selectedMemberId} 
                onChange={(e) => setSelectedMemberId(e.target.value)}
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', textOverflow: 'ellipsis' }}
              >
                <option value="">-- Select Member --</option>
                {members.map(m => (
                  <option key={m["Member ID"]} value={m["Member ID"]}>
                    {m.Name} ({m.Email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAssigningRole(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleAssignRole}
                disabled={!selectedMemberId}
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REMOVAL MODAL */}
      {removingMember && createPortal(
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <button className="drawer-close" onClick={() => setRemovingMember(null)}><X size={24} /></button>
            <h2 style={{ marginBottom: '8px', fontSize: '20px', color: '#ef4444' }}>Remove Member</h2>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}><strong>{removingMember.Name}</strong></p>

            {fetchingPayments ? (
              <p>Checking pending dues...</p>
            ) : (
              <>
                {pendingPayments.length > 0 ? (
                  <div style={{ backgroundColor: 'var(--error-light)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--error)', margin: '0 0 8px 0', fontSize: '14px' }}>Pending Dues Detected ({pendingPayments.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="radio" name="dues" checked={duesAction === 'cleared'} onChange={() => setDuesAction('cleared')} />
                        Confirm dues cleared externally
                      </label>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="radio" name="dues" checked={duesAction === 'waiver_requested'} onChange={() => setDuesAction('waiver_requested')} />
                        Request dues waiver from approvers
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'var(--success-light)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ color: 'var(--success)', margin: 0, fontSize: '13px', fontWeight: 'bold' }}>No pending dues. Safe to remove.</p>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Reason for Removal</label>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    value={removalNotes} 
                    onChange={e => setRemovalNotes(e.target.value)}
                    placeholder="Provide a reason..."
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRemovingMember(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', border: 'none', color: 'white' }} onClick={handleProposeRemoval} disabled={proposingRemoval}>
                    {proposingRemoval ? 'Proposing...' : 'Propose Removal'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
