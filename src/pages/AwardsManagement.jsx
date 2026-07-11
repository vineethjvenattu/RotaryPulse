import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BADGE_DEFINITIONS, evaluateCriteria, getCriteriaDeductions } from '../utils/badges';
import { Award, Plus, Trash2, CheckCircle, X, Users, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import './pages.css';

export function AwardsManagement() {
  const { currentUser, isPresident, isSecretary, isTreasurer } = useAuth();
  const isPST = isPresident || isSecretary || isTreasurer;

  const [loading, setLoading] = useState(true);
  const [criteriaCards, setCriteriaCards] = useState([]);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [approvals, setApprovals] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCriteria, setNewCriteria] = useState({
    name: '',
    trophyId: 'paul_harris_fellow',
    ruleGroups: [
      { conditions: [ { metric: 'donations_amount', operator: '>=', value: '' } ] }
    ]
  });

  const [selectedCriteria, setSelectedCriteria] = useState(null);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [assigning, setAssigning] = useState(false);
  const [showAllRecentApprovals, setShowAllRecentApprovals] = useState(false);

  useEffect(() => {
    if (currentUser?.chapterId && isPST) {
      fetchData();
    }
  }, [currentUser, isPST]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [critRes, allData, approvalsRes] = await Promise.all([
        api.getAwardCriteria(currentUser.chapterId),
        api.fetchAllData(),
        api.getAwardApprovals(currentUser.chapterId)
      ]);
      
      if (critRes.success) setCriteriaCards(critRes.data);
      if (allData.success && allData.data) {
        setMembers(allData.data.members || []);
        setPayments(allData.data.payments || []);
        setAttendance(allData.data.attendance || []);
      }
      if (approvalsRes.success) setApprovals(approvalsRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreateCriteria = async (e) => {
    e.preventDefault();
    if (!newCriteria.name) return alert("Please fill criteria name.");
    // basic validation
    for (let group of newCriteria.ruleGroups) {
      for (let cond of group.conditions) {
        if (!cond.value) return alert("Please fill all threshold values.");
      }
    }
    
    setCreating(true);
    const criteriaData = {
      ...newCriteria,
      createdBy: currentUser["Member ID"],
      createdByName: currentUser["Name"],
      createdAt: new Date().toISOString()
    };
    
    const res = await api.createAwardCriteria(currentUser.chapterId, criteriaData);
    setCreating(false);
    
    if (res.success) {
      setShowCreateModal(false);
      setNewCriteria({ 
        name: '', 
        trophyId: 'paul_harris_fellow', 
        ruleGroups: [ { conditions: [ { metric: 'donations_amount', operator: '>=', value: '' } ] } ]
      });
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleDeleteCriteria = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this criteria card?")) return;
    const res = await api.deleteAwardCriteria(currentUser.chapterId, id);
    if (res.success) {
      if (selectedCriteria?.id === id) setSelectedCriteria(null);
      fetchData();
    }
  };

  const selectCriteria = (criteria) => {
    setSelectedCriteria(criteria);
    setSelectedMemberIds(new Set());
    
    // Calculate eligible members
    const eligible = [];
    members.forEach(member => {
      // Don't show if they already have this exact badge manually awarded
      const hasBadge = (member.badges || []).some(b => b.id === criteria.trophyId);
      
      // Don't show if they already have a pending proposal for this trophy
      const isPending = approvals.some(app => 
        app.status === 'pending' && 
        app.badgeDefinition?.id === criteria.trophyId && 
        app.memberIds.includes(member["Member ID"])
      );

      if (!hasBadge && !isPending) {
        const meets = evaluateCriteria(member, criteria, payments, attendance);
        if (meets) {
          eligible.push(member);
        }
      }
    });
    setEligibleMembers(eligible);
  };

  const handleToggleMember = (memberId) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(memberId)) newSelected.delete(memberId);
    else newSelected.add(memberId);
    setSelectedMemberIds(newSelected);
  };
  
  const handleToggleAll = () => {
    if (selectedMemberIds.size === eligibleMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(eligibleMembers.map(m => m["Member ID"])));
    }
  };

  const handleAssignAwards = async () => {
    if (selectedMemberIds.size === 0) return;
    if (!window.confirm(`Propose this trophy for ${selectedMemberIds.size} members?`)) return;

    setAssigning(true);
    const badgeDef = Object.values(BADGE_DEFINITIONS).find(b => b.id === selectedCriteria.trophyId);
    
    const memberDeductions = {};
    Array.from(selectedMemberIds).forEach(id => {
      const member = members.find(m => m["Member ID"] === id || m.id === id);
      if (member) {
        memberDeductions[id] = getCriteriaDeductions(member, selectedCriteria, payments, attendance);
      }
    });

    const res = await api.proposeAward(
      currentUser.chapterId,
      selectedCriteria,
      Array.from(selectedMemberIds),
      badgeDef,
      currentUser,
      memberDeductions
    );
    
    setAssigning(false);
    
    if (res.success) {
      alert("Award proposal created successfully! Other PST members will need to approve it.");
      fetchData();
      setSelectedCriteria(null);
    } else {
      alert("Failed to propose awards: " + res.error);
    }
  };

  const handleApproveApproval = async (approvalId) => {
    if (!window.confirm("Approve this award proposal?")) return;
    const res = await api.approveAward(currentUser.chapterId, approvalId, currentUser.Role, currentUser.Name);
    if (res.success) {
      if (res.completed) alert("Award fully approved and badges granted!");
      else alert("Approval recorded successfully.");
      fetchData();
    } else {
      alert("Failed to approve: " + res.error);
    }
  };

  const handleRejectApproval = async (approvalId) => {
    if (!window.confirm("Reject this award proposal? This will cancel the award.")) return;
    const res = await api.rejectAward(currentUser.chapterId, approvalId, currentUser.Role, currentUser.Name);
    if (res.success) {
      alert("Proposal rejected.");
      fetchData();
    } else {
      alert("Failed to reject: " + res.error);
    }
  };

  const handleUpdateCondition = (gIdx, cIdx, field, val) => {
    const updated = [...newCriteria.ruleGroups];
    updated[gIdx].conditions[cIdx][field] = val;
    setNewCriteria({...newCriteria, ruleGroups: updated});
  };

  const handleAddCondition = (gIdx) => {
    const updated = [...newCriteria.ruleGroups];
    updated[gIdx].conditions.push({ metric: 'donations_amount', operator: '>=', value: '' });
    setNewCriteria({...newCriteria, ruleGroups: updated});
  };

  const handleRemoveCondition = (gIdx, cIdx) => {
    const updated = [...newCriteria.ruleGroups];
    updated[gIdx].conditions.splice(cIdx, 1);
    if (updated[gIdx].conditions.length === 0) updated.splice(gIdx, 1);
    if (updated.length === 0) updated.push({ conditions: [{ metric: 'donations_amount', operator: '>=', value: '' }] });
    setNewCriteria({...newCriteria, ruleGroups: updated});
  };

  const handleAddRuleGroup = () => {
    const updated = [...newCriteria.ruleGroups];
    updated.push({ conditions: [{ metric: 'donations_amount', operator: '>=', value: '' }] });
    setNewCriteria({...newCriteria, ruleGroups: updated});
  };

  if (!isPST) {
    return <div className="content-area"><p>Access Denied. Only PST members can manage awards.</p></div>;
  }

  const formatCondition = (cond) => {
    const mName = cond.metric === 'donations_amount' ? 'Total Donations' : cond.metric === 'attendance_rate' ? 'Attendance Rate' : 'Events Attended';
    const pre = cond.metric === 'donations_amount' ? '$' : '';
    const post = cond.metric === 'attendance_rate' ? '%' : '';
    return `${mName} ${cond.operator} ${pre}${cond.value}${post}`;
  };

  const manualTrophies = Object.values(BADGE_DEFINITIONS).filter(b => !['early_bird', 'philanthropist', 'active_participant', 'opinion_leader'].includes(b.id));

  const pendingApprovalsList = approvals.filter(a => a.status === 'pending');
  const pastApprovalsList = approvals.filter(a => a.status !== 'pending');
  const visiblePastApprovals = showAllRecentApprovals ? pastApprovalsList : pastApprovalsList.slice(0, 5);

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1>Awards Management</h1>
          <p className="page-subtitle">Define criteria, monitor eligible members, and manually assign prestigious trophies.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> New Criteria Card
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading criteria...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px' }}>
          
          {/* Main Stage (Left Panel) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Pending Approvals Section */}
            {pendingApprovalsList.length > 0 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px' }}>Pending Approvals</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingApprovalsList.map(approval => (
                    <div key={approval.id} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{typeof approval.criteriaName === 'object' ? approval.criteriaName?.name || JSON.stringify(approval.criteriaName) : approval.criteriaName}</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Proposed by {approval.initiator.name} ({approval.initiator.role}) for: {
                            approval.memberIds.map(id => {
                              const m = members.find(mem => mem["Member ID"] === id || mem.id === id);
                              return m ? m.Name : id;
                            }).join(", ")
                          }
                        </p>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                          {Object.entries(approval.approvals).map(([role, statusData]) => (
                            <div key={role} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: statusData.status === 'approved' ? 'var(--success)' : statusData.status === 'rejected' ? 'var(--error)' : 'var(--text-secondary)' }}>
                              {statusData.status === 'approved' && <CheckCircle size={14} />}
                              {statusData.status === 'rejected' && <X size={14} />}
                              {statusData.status === 'pending' && <AlertCircle size={14} />}
                              {role}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action buttons for current user if pending */}
                      {approval.status === 'pending' && approval.approvals[currentUser.Role] && approval.approvals[currentUser.Role].status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleRejectApproval(approval.id)}
                            style={{ padding: '6px 12px', color: 'var(--error)', borderColor: 'var(--error)' }}
                          >
                            Reject
                          </button>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleApproveApproval(approval.id)}
                            style={{ padding: '6px 12px' }}
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Criteria Cards Grid */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', marginBottom: '16px' }}>Active Criteria</h3>
              {criteriaCards.length === 0 ? (
                <div style={{ padding: '32px', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p>No criteria cards created yet.</p>
                  <button className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>Create One Now</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {criteriaCards.map(criteria => {
                    const badge = Object.values(BADGE_DEFINITIONS).find(b => b.id === criteria.trophyId);
                    const isSelected = selectedCriteria?.id === criteria.id;
                    
                    return (
                      <div 
                        key={criteria.id}
                        onClick={() => selectCriteria(criteria)}
                        style={{ 
                          background: 'white', 
                          border: `2px solid ${isSelected ? 'var(--rotary-blue)' : 'var(--border-color)'}`, 
                          borderRadius: '12px', 
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(11, 46, 126, 0.15)' : 'none',
                          position: 'relative'
                        }}
                      >
                        <button 
                          onClick={(e) => handleDeleteCriteria(criteria.id, e)}
                          style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          {badge && <img src={badge.image} alt={badge.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />}
                          <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{typeof criteria.name === 'object' ? criteria.name?.name || JSON.stringify(criteria.name) : criteria.name}</h4>
                            <span style={{ fontSize: '13px', color: 'var(--rotary-blue)', fontWeight: 500 }}>{badge?.name}</span>
                          </div>
                        </div>
                        
                        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Criteria:</div>
                          {(criteria.ruleGroups || [{ conditions: [{ metric: criteria.metric, operator: criteria.operator, value: criteria.value }] }]).map((group, gIdx) => (
                            <div key={gIdx} style={{ marginBottom: gIdx < (criteria.ruleGroups?.length || 1) - 1 ? '8px' : 0 }}>
                              {group.conditions.map((cond, cIdx) => (
                                <span key={cIdx}>
                                  {formatCondition(cond)}
                                  {cIdx < group.conditions.length - 1 && <strong style={{ color: 'var(--rotary-blue)', margin: '0 6px' }}>AND</strong>}
                                </span>
                              ))}
                              {gIdx < (criteria.ruleGroups?.length || 1) - 1 && <div style={{ fontWeight: 700, margin: '4px 0', color: 'var(--rotary-gold)' }}>OR</div>}
                            </div>
                          ))}
                        </div>
                        {isSelected && (
                          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }} className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div>
                                <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--rotary-blue-dark)' }}>Eligible Candidates ({eligibleMembers.length})</h5>
                              </div>
                              {eligibleMembers.length > 0 && (
                                <button 
                                  className="btn btn-primary" 
                                  onClick={(e) => { e.stopPropagation(); handleAssignAwards(); }}
                                  disabled={selectedMemberIds.size === 0 || assigning}
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                  <Award size={14} style={{ marginRight: '6px' }} /> 
                                  {assigning ? 'Proposing...' : `Propose Award (${selectedMemberIds.size})`}
                                </button>
                              )}
                            </div>
                            
                            {eligibleMembers.length === 0 ? (
                              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                <p style={{ margin: 0 }}>No eligible candidates found for this criteria.</p>
                              </div>
                            ) : (
                              <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <table className="table" style={{ margin: 0 }}>
                                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                                    <tr>
                                      <th style={{ width: '40px', padding: '12px' }}>
                                        <input 
                                          type="checkbox" 
                                          checked={selectedMemberIds.size === eligibleMembers.length && eligibleMembers.length > 0}
                                          onChange={(e) => { e.stopPropagation(); handleToggleAll(); }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </th>
                                      <th>Member</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {eligibleMembers.map(member => (
                                      <tr 
                                        key={member["Member ID"]} 
                                        onClick={(e) => { e.stopPropagation(); handleToggleMember(member["Member ID"]); }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <td style={{ padding: '12px' }}>
                                          <input 
                                            type="checkbox" 
                                            checked={selectedMemberIds.has(member["Member ID"])}
                                            onChange={() => {}} 
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar name={member["Name"]} imageUrl={member["Profile Picture"]} size="32px" />
                                            <div>
                                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member["Name"]}</div>
                                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member["Member ID"]}</div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div>
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: 'var(--rotary-gold)' }} /> Recent Approvals
              </h3>
              
              {pastApprovalsList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No past approvals.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {visiblePastApprovals.map(approval => (
                    <div key={approval.id} style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ margin: '0', fontSize: '14px', fontWeight: 600 }}>{typeof approval.criteriaName === 'object' ? approval.criteriaName?.name || JSON.stringify(approval.criteriaName) : approval.criteriaName}</h4>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: approval.status === 'completed' ? '#dcfce7' : '#fee2e2', color: approval.status === 'completed' ? '#166534' : '#991b1b' }}>
                          {approval.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {approval.memberIds.length} member(s)
                      </p>
                      
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: '4px' }}><strong>Proposed:</strong> {new Date(approval.createdAt).toLocaleDateString()} by {approval.initiator.name}</div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {Object.entries(approval.approvals).map(([role, statusData]) => (
                            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: statusData.status === 'approved' ? 'var(--success)' : statusData.status === 'rejected' ? 'var(--error)' : 'var(--text-secondary)' }}>
                              {statusData.status === 'approved' ? <CheckCircle size={10} /> : <X size={10} />}
                              {role}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pastApprovalsList.length > 5 && !showAllRecentApprovals && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowAllRecentApprovals(true)}
                      style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                    >
                      View More
                    </button>
                  )}
                  {showAllRecentApprovals && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowAllRecentApprovals(false)}
                      style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                    >
                      Show Less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Criteria Modal */}
      {showCreateModal && (
        <Modal isOpen={true} title="Create Criteria Card" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateCriteria}>
            <div className="form-group">
              <label className="form-label">Criteria Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g., Diamond Donors 2026"
                value={newCriteria.name}
                onChange={e => setNewCriteria({...newCriteria, name: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Trophy to Award</label>
              <select 
                className="form-control"
                value={newCriteria.trophyId}
                onChange={e => setNewCriteria({...newCriteria, trophyId: e.target.value})}
              >
                {manualTrophies.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ marginBottom: '12px' }}>Eligibility Rules</label>
              
              {newCriteria.ruleGroups.map((group, gIdx) => (
                <div key={gIdx} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                  {gIdx > 0 && <div style={{ fontWeight: 700, color: 'var(--rotary-gold)', marginBottom: '12px', textAlign: 'center', marginTop: '-28px' }}><span style={{ background: 'white', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>OR</span></div>}
                  
                  {group.conditions.map((cond, cIdx) => (
                    <div key={cIdx} style={{ position: 'relative' }}>
                      {cIdx > 0 && <div style={{ fontWeight: 600, color: 'var(--rotary-blue)', margin: '8px 0', fontSize: '14px' }}>AND</div>}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 2 }}>
                          <select 
                            className="form-control"
                            value={cond.metric}
                            onChange={e => handleUpdateCondition(gIdx, cIdx, 'metric', e.target.value)}
                          >
                            <option value="donations_amount">Total Donations ($)</option>
                            <option value="events_attended">Total Events Attended (Count)</option>
                            <option value="attendance_rate">Attendance Rate (%)</option>
                          </select>
                        </div>
                        <div style={{ width: '80px' }}>
                          <select 
                            className="form-control"
                            value={cond.operator}
                            onChange={e => handleUpdateCondition(gIdx, cIdx, 'operator', e.target.value)}
                          >
                            <option value=">=">{'>='}</option>
                            <option value=">">{'>'}</option>
                            <option value="==">{"="}</option>
                            <option value="<=">{'<='}</option>
                            <option value="<">{'<'}</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="Val"
                            value={cond.value}
                            onChange={e => handleUpdateCondition(gIdx, cIdx, 'value', e.target.value)}
                            required
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCondition(gIdx, cIdx)}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '10px 4px', marginTop: '2px' }}
                          title="Remove Condition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={() => handleAddCondition(gIdx)}
                    style={{ background: 'none', border: 'none', color: 'var(--rotary-blue)', cursor: 'pointer', padding: '0', marginTop: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add AND Condition
                  </button>
                </div>
              ))}

              <button 
                type="button" 
                onClick={handleAddRuleGroup}
                className="btn btn-secondary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px' }}
              >
                <Plus size={16} /> Add Alternative Rule (OR)
              </button>
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Once created, the system will instantly scan your club's database and identify any members who meet this rule. You can then review them and manually award the trophy.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Saving...' : 'Create Criteria'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
