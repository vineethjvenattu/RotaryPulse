import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import Papa from 'papaparse';
import { Avatar } from '../components/Avatar';
import { Users, Upload, Download, ArrowLeft, UserCircle, Save, Plus, X } from 'lucide-react';
import { getTagColor } from '../utils/tagColors';
import { Modal } from '../components/Modal';
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

  // Assign Designations state
  const [globalDesignations, setGlobalDesignations] = useState([]);
  const [assigningDesignationsMember, setAssigningDesignationsMember] = useState(null);
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [savingDesignations, setSavingDesignations] = useState(false);

  // Settings State
  const [referralBonusAmount, setReferralBonusAmount] = useState('');
  const [allowedMemberCardFields, setAllowedMemberCardFields] = useState([]);
  const [showRelations, setShowRelations] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Removal state
  const [removingMember, setRemovingMember] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const initiateRemoval = (member) => {
    setRemovingMember(member);
  };

  const handleDirectRemoval = async () => {
    if (!removingMember) return;
    setRemoving(true);
    const res = await api.superAdminRemoveMember(chapterId, removingMember["Member ID"]);
    setRemoving(false);
    if (res.success) {
      setRemovingMember(null);
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedMembers.size === 0) return;
    if (!window.confirm(`Are you sure you want to directly remove ${selectedMembers.size} members? This action cannot be undone.`)) return;

    setBulkRemoving(true);
    let successCount = 0;
    for (const mId of selectedMembers) {
      const res = await api.superAdminRemoveMember(chapterId, mId);
      if (res.success) successCount++;
    }
    setBulkRemoving(false);
    setSelectedMembers(new Set());
    
    if (successCount > 0) {
      alert(`Successfully removed ${successCount} members.`);
      fetchData();
    }
  };

  const toggleMemberSelection = (mId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(mId)) {
      newSelected.delete(mId);
    } else {
      newSelected.add(mId);
    }
    setSelectedMembers(newSelected);
  };

  const toggleAllMembers = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m["Member ID"])));
    }
  };

  useEffect(() => {
    fetchData();
  }, [chapterId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch global config
    const configRes = await api.getGlobalConfig();
    if (configRes.success) {
      setGlobalRoles(configRes.config.roles || []);
      setGlobalDesignations(configRes.config.rotaryDesignations || []);
    }
    // Fetch chapter settings
    const chapterRes = await api.getChapterData(chapterId);
    if (chapterRes.success && chapterRes.data) {
      const { data: chapterData } = chapterRes;
      setReferralBonusAmount(chapterData.referralBonusAmount || '');
      setAllowedMemberCardFields(chapterData.allowedMemberCardFields || []);
      setShowRelations(!!chapterData.showRelations);
    }
    // Fetch members for this chapter
    const memRes = await api.getChapterMembers(chapterId);
    if (memRes.success) {
      const getRank = (role) => {
        if (!role || role === 'Member') return 99;
        const gRoles = configRes && configRes.success && configRes.config.roles ? configRes.config.roles : ['President', 'Secretary', 'Treasurer'];
        const idx = gRoles.indexOf(role);
        if (idx !== -1) return idx + 1;
        return 10;
      };
      const sortedMembers = [...memRes.members].sort((a, b) => {
        const rankA = getRank(a.Role);
        const rankB = getRank(b.Role);
        if (rankA !== rankB) return rankA - rankB;
        return (a.Name || '').localeCompare(b.Name || '');
      });
      setMembers(sortedMembers);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const res = await api.updateChapterSettings(chapterId, { 
      referralBonusAmount,
      allowedMemberCardFields,
      showRelations
    });
    setSavingSettings(false);
    if (res.success) {
      alert("Settings saved successfully!");
    } else {
      alert("Error saving settings: " + res.error);
    }
  };

  const handleAssignDesignations = async () => {
    setSavingDesignations(true);
    const res = await api.assignDesignations(chapterId, assigningDesignationsMember["Member ID"], selectedDesignations);
    setSavingDesignations(false);
    if (res.success) {
      setAssigningDesignationsMember(null);
      fetchData();
    } else {
      alert("Error saving designations: " + res.error);
    }
  };

  const toggleDesignation = (desig) => {
    if (selectedDesignations.includes(desig)) {
      setSelectedDesignations(selectedDesignations.filter(d => d !== desig));
    } else {
      setSelectedDesignations([...selectedDesignations, desig]);
    }
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
      transformHeader: (header) => header.trim(),
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
              const slNo = row['Sl No'] ? row['Sl No'].trim() : '';
              
              let email = row['E-mail'] ? row['E-mail'].trim() : '';
              const mobile = row['Mobile No'] ? row['Mobile No'].trim() : '';
              
              // Generate deterministic ID based on Sl No seed
              let memberId = slNo ? `MEM-${slNo.padStart(4, '0')}` : `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

              if (!email) {
                email = `${memberId}@rotary.org`;
              }

              const resultRow = {
                "Member ID": memberId,
                "Rotary ID": rId,
                "Name": nameStr,
                "Name (Rotary ID)": rId ? `${nameStr} (${rId})` : nameStr,
                "Email": email.toLowerCase(),
              };

              if (row['Gender'] && row['Gender'].trim()) resultRow["Gender"] = row['Gender'].trim();
              if (mobile) resultRow["Mobile"] = mobile;
              if (row['Address'] && row['Address'].trim()) resultRow["Address"] = row['Address'].trim();
              if (row['Profession'] && row['Profession'].trim()) resultRow["Profession"] = row['Profession'].trim();
              if (row['Spouse Name'] && row['Spouse Name'].trim()) resultRow["Spouse Name"] = row['Spouse Name'].trim();
              if (row['DOB'] && row['DOB'].trim()) resultRow["Birthday"] = row['DOB'].trim();

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

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Integrations & Settings</h3>
      <div style={{ 
        backgroundColor: 'var(--bg-tertiary)', 
        borderRadius: 'var(--border-radius-md)', 
        padding: '24px', 
        border: '1px solid var(--border-color)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Referral Bonus Amount (₹)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 500"
              value={referralBonusAmount}
              onChange={(e) => setReferralBonusAmount(e.target.value)}
              style={{ width: '100%', maxWidth: '200px' }}
            />
          </div>
        
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />
        
        <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '16px' }}>Member Directory Fields</h4>
        <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Select which data fields regular members are allowed to see in the member directory cards. (Super Admins always see all fields).
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {Array.from(new Set(members.flatMap(m => Object.keys(m))))
            .filter(k => !['id', 'chapterId', 'Pin', 'status', 'SearchName', 'Name', 'Role', 'Mobile', 'Member ID', 'Rotary ID', 'hasPin', 'FamilyMembers', 'Designations'].includes(k))
            .map(field => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={allowedMemberCardFields.includes(field)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAllowedMemberCardFields([...allowedMemberCardFields, field]);
                    } else {
                      setAllowedMemberCardFields(allowedMemberCardFields.filter(f => f !== field));
                    }
                  }}
                />
                {field}
              </label>
            ))
          }
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="checkbox" 
            id="showRelationsConfig"
            checked={showRelations}
            onChange={(e) => setShowRelations(e.target.checked)}
          />
          <label htmlFor="showRelationsConfig" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Show Approved Relations in Member Cards
          </label>
        </div>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleSaveSettings} 
          disabled={savingSettings}
          style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={16} /> {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Club Leadership Roles</h3>
      
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
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rotary ID: {occupant["Rotary ID"] || "N/A"}</div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', margin: 0 }}>All Chapter Members</h3>
        {selectedMembers.size > 0 && (
          <button 
            className="btn btn-primary" 
            style={{ background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleBulkRemove}
            disabled={bulkRemoving}
          >
            {bulkRemoving ? 'Removing...' : `Bulk Remove (${selectedMembers.size})`}
          </button>
        )}
      </div>
      
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
                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={members.length > 0 && selectedMembers.size === members.length}
                    onChange={toggleAllMembers}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>Name & Rotary ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m["Member ID"]} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedMembers.has(m["Member ID"])}
                      onChange={() => toggleMemberSelection(m["Member ID"])}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar member={m} size={28} className="chapter-member-avatar" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.Name}</div>
                        {(m.Designations || []).map(d => {
                          const tagColor = getTagColor(d);
                          return (
                            <span key={d} style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: tagColor.bg,
                              color: tagColor.text,
                              border: `1px solid ${tagColor.bg}`,
                              display: 'inline-block'
                            }}>
                              {d}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rotary ID: {m["Rotary ID"] || "N/A"}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setAssigningDesignationsMember(m); setSelectedDesignations(m.Designations || []); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Tags
                        </button>
                        <button onClick={() => initiateRemoval(m)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ASSIGN ROLE MODAL */}
      {/* ASSIGN ROLE MODAL */}
      <Modal
        isOpen={!!assigningRole}
        onClose={() => setAssigningRole(null)}
        title={`Assign ${assigningRole}`}
        footer={
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
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
        }
      >
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
                {m.Name} (Rotary ID: {m["Rotary ID"] || "N/A"})
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* ASSIGN DESIGNATIONS MODAL */}
      {/* ASSIGN DESIGNATIONS MODAL */}
      <Modal
        isOpen={!!assigningDesignationsMember}
        onClose={() => setAssigningDesignationsMember(null)}
        title="Designations"
        footer={
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAssigningDesignationsMember(null)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }} 
              onClick={handleAssignDesignations}
              disabled={savingDesignations}
            >
              {savingDesignations ? 'Saving...' : 'Save Designations'}
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Assign tags/designations to <strong>{assigningDesignationsMember?.Name}</strong>.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {globalDesignations.map(desig => {
            const isSelected = selectedDesignations.includes(desig);
            const tagColor = getTagColor(desig);
            return (
              <button 
                key={desig}
                onClick={() => {
                  if (selectedDesignations.includes(desig)) {
                    setSelectedDesignations(selectedDesignations.filter(d => d !== desig));
                  } else {
                    setSelectedDesignations([...selectedDesignations, desig]);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? `1px solid ${tagColor.bg}` : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? tagColor.bg : 'transparent',
                  color: isSelected ? tagColor.text : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                {desig}
              </button>
            );
          })}
          {globalDesignations.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No designations configured in Global Settings.</p>
          )}
        </div>
      </Modal>

      {/* REMOVAL MODAL */}
      {/* REMOVAL MODAL */}
      <Modal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        title="Remove Member"
        footer={
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRemovingMember(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', border: 'none', color: 'white' }} onClick={handleDirectRemoval} disabled={removing}>
              {removing ? 'Removing...' : 'Remove Immediately'}
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '14px', marginBottom: '24px' }}>Are you sure you want to remove <strong>{removingMember?.Name}</strong>? This will permanently delete the member immediately without requiring approvals.</p>
      </Modal>

    </div>
  );
}
