import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard, Check, ShieldAlert, Landmark, Info, X, AlertCircle,
  Plus, Users, Calendar, CheckSquare, Square, Pencil, ThumbsUp, ThumbsDown,
  ArrowRight, Clock, XCircle
} from 'lucide-react';
import './pages.css';

const COMMITTEE_ROLES = ['President', 'Secretary', 'Treasurer'];
const PAYMENT_CATEGORIES = [
  'Membership Fee', 'Fellowship Drinks', 'Charity / Additional Donations',
  'Event Registration', 'District Conference Fee', 'Club Dues',
  'Project Contribution', 'Fine', 'Other'
];

// Fallback test UPI ID (Replace with an env variable or Chapter Profile setting in the future)
const TEST_UPI_ID = "testupi@ybl";

// ── Diff row helper ───────────────────────────────────────────────────────────
const DiffRow = ({ label, oldVal, newVal }) => {
  if (String(oldVal) === String(newVal)) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--error)', textDecoration: 'line-through', background: 'var(--error-light)', padding: '2px 6px', borderRadius: 4 }}>{oldVal}</span>
        <ArrowRight size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, background: 'var(--success-light)', padding: '2px 6px', borderRadius: 4 }}>{newVal}</span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const Payments = ({ data, loading, refreshData }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dues');

  // Payment gateway state
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [utr, setUtr] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  // Create Receivable modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [rcCategory, setRcCategory] = useState('Membership Fee');
  const [rcAmount, setRcAmount] = useState('');
  const [rcDescription, setRcDescription] = useState('');
  const [rcDueDate, setRcDueDate] = useState('');
  const [rcEventId, setRcEventId] = useState('');

  // Edit Payment modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // original payment object
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Approval action state
  const [approvalBusy, setApprovalBusy] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Payments...</div>;
  }

  const { payments = [], members = [], events = [], paymentEdits = [] } = data;

  const isCommittee = currentUser && COMMITTEE_ROLES.includes(currentUser["Role"]);
  const isFinancialAdmin = currentUser && ["President", "Treasurer"].includes(currentUser["Role"]);

  const myId = currentUser?.["Member ID"];

  // Compute approval badge count for this user
  const myPendingApprovals = paymentEdits.filter(e =>
    e["Status"] === "pending" &&
    e["Required Approvers"]?.includes(myId) &&
    !e["Approvals"]?.includes(myId)
  );

  const ownPayments = payments.filter(p => p["Member ID"] === myId);
  const myDues = ownPayments.filter(p => p["Status"] === "Pending" || p["Status"] === "Verification Pending");
  const myHistory = ownPayments.filter(p => p["Status"] === "Paid");

  const allDues = payments.filter(p => p["Status"] === "Pending" || p["Status"] === "Verification Pending");
  const allHistory = payments.filter(p => p["Status"] === "Paid");

  const totalDuesAmount = myDues.reduce((sum, p) => sum + Number(p["Amount"]), 0);
  const allDuesAmount = allDues.reduce((sum, p) => sum + Number(p["Amount"]), 0);

  // Proposed by me — pending/rejected
  const myProposedEdits = paymentEdits.filter(e =>
    e["Proposed By"] === myId && ["pending", "rejected"].includes(e["Status"])
  );

  const formatDisplayDate = (ds) => {
    if (!ds) return '—';
    return new Date(ds).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Gateway handlers ──────────────────────────────────────────────────────
  const handlePayNowClick = (payment) => {
    setSelectedPayment(payment);
    setPaySuccess(false);
    setPayError('');
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (paymentMethod === 'upi' && (!utr || utr.trim().length < 6)) { setPayError('Please enter a valid Transaction Reference (UTR)'); return; }
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvv)) { setPayError('Please fill in card details'); return; }
    setPayError('');
    setPaying(true);
    try {
      const reference = paymentMethod === 'upi' ? utr : `CARD-${cardNumber.slice(-4)}`;
      const result = await api.submitPaymentReference(selectedPayment["Payment ID"], reference);
      if (result.success) {
        setPaySuccess(true);
        setTimeout(async () => { setSelectedPayment(null); await refreshData(); }, 1500);
      } else { setPayError(result.error || 'Payment transaction failed'); }
    } catch { setPayError('Error processing payment transaction'); }
    finally { setPaying(false); }
  };

  // ── Create Receivable handlers ────────────────────────────────────────────
  const openCreateModal = () => {
    setShowCreateModal(true); setCreateError(''); setCreateSuccess(false);
    setSelectedMemberIds([]); setRcCategory('Membership Fee'); setRcAmount(''); setRcDescription('');
    const d = new Date(); d.setDate(d.getDate() + 30);
    setRcDueDate(d.toISOString().split('T')[0]); setRcEventId('');
  };
  const closeCreateModal = () => { if (!creating) setShowCreateModal(false); };
  const toggleMember = (id) => setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreateReceivables = async (e) => {
    e.preventDefault(); setCreateError('');
    if (selectedMemberIds.length === 0) { setCreateError('Please select at least one member.'); return; }
    if (!rcAmount || Number(rcAmount) <= 0) { setCreateError('Please enter a valid amount.'); return; }
    if (!rcDescription.trim()) { setCreateError('Please enter a description.'); return; }
    if (!rcDueDate) { setCreateError('Please set a due date.'); return; }
    setCreating(true);
    try {
      const membersToCharge = members.filter(m => selectedMemberIds.includes(m["Member ID"]));
      const result = await api.createReceivables(membersToCharge, rcCategory, Number(rcAmount), rcDescription.trim(), rcDueDate, rcEventId);
      if (result.success) {
        setCreateSuccess(true);
        setTimeout(async () => { setShowCreateModal(false); await refreshData(); }, 1800);
      } else { setCreateError(result.error || 'Failed to create receivable entries.'); }
    } catch { setCreateError('An unexpected error occurred.'); }
    finally { setCreating(false); }
  };

  // ── Edit Payment handlers ─────────────────────────────────────────────────
  const openEditModal = (payment) => {
    setEditTarget(payment);
    setEditAmount(String(payment["Amount"]));
    setEditDescription(payment["Description"] || '');
    setEditDueDate(payment["Due Date"] || '');
    setEditCategory(payment["Category"] || PAYMENT_CATEGORIES[0]);
    setEditNotes(payment["Notes"] || '');
    setEditError('');
    setEditSuccess(false);
    setShowEditModal(true);
  };
  const closeEditModal = () => { if (!editSubmitting) setShowEditModal(false); };

  const handleProposeEdit = async (e) => {
    e.preventDefault(); setEditError('');
    if (!editAmount || Number(editAmount) <= 0) { setEditError('Please enter a valid amount.'); return; }
    if (!editDescription.trim()) { setEditError('Please enter a description.'); return; }
    if (!editDueDate) { setEditError('Please set a due date.'); return; }
    setEditSubmitting(true);
    try {
      const changes = {
        "Amount": Number(editAmount),
        "Description": editDescription.trim(),
        "Due Date": editDueDate,
        "Category": editCategory,
        "Notes": editNotes.trim()
      };
      const original = {
        "Amount": editTarget["Amount"],
        "Description": editTarget["Description"],
        "Due Date": editTarget["Due Date"],
        "Category": editTarget["Category"],
        "Notes": editTarget["Notes"] || ''
      };
      const result = await api.proposePaymentEdit(editTarget["Payment ID"], changes, original, currentUser, members);
      if (result.success) {
        setEditSuccess(true);
        setTimeout(async () => { setShowEditModal(false); await refreshData(); }, 1800);
      } else { setEditError(result.error || 'Failed to propose edit.'); }
    } catch { setEditError('An unexpected error occurred.'); }
    finally { setEditSubmitting(false); }
  };

  // ── Approval action handlers ──────────────────────────────────────────────
  const handleApprove = async (editId) => {
    setApprovalBusy(editId + '_approve');
    try {
      const result = await api.approvePaymentEdit(editId, currentUser);
      await refreshData();
      if (result.applied) {/* payment was updated — refreshData handles the UI */}
    } catch { /* silent */ }
    finally { setApprovalBusy(''); }
  };

  const handleReject = async (editId) => {
    setApprovalBusy(editId + '_reject');
    try {
      await api.rejectPaymentEdit(editId, currentUser);
      await refreshData();
    } catch { /* silent */ }
    finally { setApprovalBusy(''); }
  };

  const handleCancel = async (editId) => {
    setApprovalBusy(editId + '_cancel');
    try {
      await api.cancelPaymentEdit(editId);
      await refreshData();
    } catch { /* silent */ }
    finally { setApprovalBusy(''); }
  };

  // ── Helpers for approval cards ────────────────────────────────────────────
  const getAffectedMemberName = (paymentId) => {
    const p = payments.find(pay => pay["Payment ID"] === paymentId);
    return p ? p["Member Name"] : paymentId;
  };

  const getCommitteeMemberName = (memberId) => {
    const m = members.find(mem => mem["Member ID"] === memberId);
    return m ? m["Name"] : memberId;
  };

  const upcomingEvents = events.filter(e => e["Date"] >= new Date().toISOString().split('T')[0]).slice(0, 10);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Payments &amp; Dues</h1>
          <p className="page-subtitle">Track outstanding contributions and dues history</p>
        </div>
        {isFinancialAdmin && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={openCreateModal}>
            <Plus size={16} /> Add Receivable
          </button>
        )}
      </div>

      {/* Outstanding banner */}
      <div className="dues-header-box">
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isFinancialAdmin ? "Total Outstanding Dues (All Members)" : "Your Outstanding Dues"}
          </span>
          <div className="outstanding-amount">
            ₹{isFinancialAdmin ? allDuesAmount.toLocaleString('en-IN') : totalDuesAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <CreditCard size={36} style={{ color: 'var(--rotary-blue-light)', opacity: 0.6 }} />
      </div>

      {/* ── APPROVALS NEEDED (for committee members) ────────────────────────── */}
      {isCommittee && myPendingApprovals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--rotary-blue-dark)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--rotary-gold)" />
            Approvals Needed ({myPendingApprovals.length})
          </h3>
          {myPendingApprovals.map(edit => {
            const paymentLabel = getAffectedMemberName(edit["Payment ID"]);
            const isBusyApprove = approvalBusy === edit["Edit ID"] + '_approve';
            const isBusyReject = approvalBusy === edit["Edit ID"] + '_reject';
            return (
              <div key={edit["Edit ID"]} className="card" style={{ marginBottom: 12, border: '1px solid var(--rotary-gold)', borderLeft: '4px solid var(--rotary-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Edit proposed by {edit["Proposed By Name"]}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      For member: <strong>{paymentLabel}</strong> · {formatDisplayDate(edit["Proposed At"])}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {edit["Required Approvers"].map(rid => {
                      const approved = edit["Approvals"]?.includes(rid);
                      const name = getCommitteeMemberName(rid);
                      return (
                        <span key={rid} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, fontWeight: 600, backgroundColor: approved ? 'var(--success-light)' : 'var(--bg-tertiary)', color: approved ? 'var(--success)' : 'var(--text-muted)', border: `1px solid ${approved ? 'var(--success)' : 'var(--border-color)'}` }}>
                          {name.split(' ').slice(-1)[0]} {approved ? '✓' : '…'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Diff */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', marginBottom: 12 }}>
                  <DiffRow label="Amount" oldVal={`₹${Number(edit["Original"]["Amount"]).toLocaleString('en-IN')}`} newVal={`₹${Number(edit["Changes"]["Amount"]).toLocaleString('en-IN')}`} />
                  <DiffRow label="Description" oldVal={edit["Original"]["Description"]} newVal={edit["Changes"]["Description"]} />
                  <DiffRow label="Category" oldVal={edit["Original"]["Category"]} newVal={edit["Changes"]["Category"]} />
                  <DiffRow label="Due Date" oldVal={formatDisplayDate(edit["Original"]["Due Date"])} newVal={formatDisplayDate(edit["Changes"]["Due Date"])} />
                  <DiffRow label="Notes" oldVal={edit["Original"]["Notes"] || '—'} newVal={edit["Changes"]["Notes"] || '—'} />
                  {["Amount", "Description", "Category", "Due Date", "Notes"].every(k => String(edit["Original"][k] || '') === String(edit["Changes"][k] || '')) && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No field changes detected.</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                    onClick={() => handleApprove(edit["Edit ID"])}
                    disabled={!!approvalBusy}
                  >
                    {isBusyApprove ? 'Processing...' : <><ThumbsUp size={15} /> Approve</>}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={() => handleReject(edit["Edit ID"])}
                    disabled={!!approvalBusy}
                  >
                    {isBusyReject ? 'Processing...' : <><ThumbsDown size={15} /> Reject</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MY PROPOSED EDITS (for the proposer) ────────────────────────────── */}
      {isCommittee && myProposedEdits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={15} /> My Proposed Edits
          </h3>
          {myProposedEdits.map(edit => {
            const paymentLabel = getAffectedMemberName(edit["Payment ID"]);
            const isRejected = edit["Status"] === "rejected";
            const isBusyCancel = approvalBusy === edit["Edit ID"] + '_cancel';
            const approvedCount = edit["Approvals"]?.length || 0;
            const requiredCount = edit["Required Approvers"]?.length || 0;
            return (
              <div key={edit["Edit ID"]} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${isRejected ? 'var(--error)' : 'var(--rotary-blue)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      Edit for: {paymentLabel}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Proposed on {formatDisplayDate(edit["Proposed At"])}
                    </div>
                  </div>
                  {isRejected ? (
                    <span style={{ fontSize: 11, color: 'var(--error)', fontWeight: 700, background: 'var(--error-light)', padding: '4px 10px', borderRadius: 12 }}>
                      ✗ Rejected by {edit["Rejected By Name"]}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--rotary-blue)', fontWeight: 700, background: 'rgba(0,61,165,0.08)', padding: '4px 10px', borderRadius: 12 }}>
                      {approvedCount}/{requiredCount} approved
                    </span>
                  )}
                </div>
                {!isRejected && (
                  <button
                    onClick={() => handleCancel(edit["Edit ID"])}
                    disabled={!!approvalBusy}
                    style={{ marginTop: 10, background: 'none', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {isBusyCancel ? 'Cancelling...' : <><XCircle size={13} /> Withdraw Edit</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-container">
        <button onClick={() => setActiveTab('dues')} className={`tab-btn ${activeTab === 'dues' ? 'active' : ''}`}>
          Outstanding Dues ({isFinancialAdmin ? allDues.length : myDues.length})
        </button>
        <button onClick={() => setActiveTab('history')} className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}>
          Payment History ({isFinancialAdmin ? allHistory.length : myHistory.length})
        </button>
      </div>

      {/* Dues / History list */}
      <div className="payments-list">
        {activeTab === 'dues' ? (
          (isFinancialAdmin ? allDues : myDues).length > 0 ? (
            (isFinancialAdmin ? allDues : myDues).map(p => {
              // Does this payment have a pending edit already?
              const hasPendingEdit = paymentEdits.some(e => e["Payment ID"] === p["Payment ID"] && e["Status"] === "pending");
              return (
                <div key={p["Payment ID"]} className="card payment-row-card">
                  <div className="payment-row-info">
                    <div className="payment-row-title">{p["Description"]}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {isFinancialAdmin && `Member: ${p["Member Name"]} • `}
                      Due: {formatDisplayDate(p["Due Date"])}{p["Category"] && ` • ${p["Category"]}`}
                    </span>
                    {hasPendingEdit && (
                      <span style={{ fontSize: 10, color: 'var(--rotary-gold)', fontWeight: 700, background: 'rgba(255,179,0,0.12)', padding: '2px 8px', borderRadius: 10, marginTop: 2, display: 'inline-block' }}>
                        ⏳ Edit pending approval
                      </span>
                    )}
                  </div>
                  <div className="payment-row-actions">
                    <span className="payment-row-amount">₹{Number(p["Amount"]).toLocaleString('en-IN')}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {p["Status"] === "Verification Pending" ? (
                        <>
                          <span className="payment-status-badge pending" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>Verifying</span>
                          {isCommittee && (
                            <>
                              <button onClick={() => api.verifyPayment(p["Payment ID"]).then(() => refreshData())} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px', background: 'var(--success)', border: 'none' }}>Approve</button>
                              <button onClick={() => api.rejectPaymentVerification(p["Payment ID"]).then(() => refreshData())} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--error)' }}>Reject</button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {p["Member ID"] === myId && (
                            <button onClick={() => handlePayNowClick(p)} className="btn btn-primary" style={{ padding: '6px 14px', borderRadius: '8px' }}>
                              Pay Now
                            </button>
                          )}
                          {isCommittee && !hasPendingEdit && p["Member ID"] !== myId && (
                            <button
                              onClick={() => openEditModal(p)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Propose an edit"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <Check size={36} style={{ color: 'var(--success)', marginBottom: '12px' }} />
              <p>All dues are cleared. Great job!</p>
            </div>
          )
        ) : (
          (isFinancialAdmin ? allHistory : myHistory).length > 0 ? (
            (isFinancialAdmin ? allHistory : myHistory).map(p => (
              <div key={p["Payment ID"]} className="card payment-row-card">
                <div className="payment-row-info">
                  <div className="payment-row-title">{p["Description"]}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {isFinancialAdmin && `Member: ${p["Member Name"]} • `}
                    Paid On: {formatDisplayDate(p["Paid Date"])}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ref: {p["Reference"]}</span>
                </div>
                <div className="payment-row-actions">
                  <span className="payment-row-amount">₹{Number(p["Amount"]).toLocaleString('en-IN')}</span>
                  <span className="payment-status-badge paid">Paid</span>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <Info size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} /><p>No past payment records found.</p>
            </div>
          )
        )}
      </div>

      {/* ══ GATEWAY MODAL ═══════════════════════════════════════════════════════ */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedPayment(null)}><X size={24} /></button>
            <div className="gateway-header">
              <Landmark size={24} style={{ color: 'var(--rotary-blue)' }} />
              <span className="gateway-brand">Rotary Checkout</span>
            </div>
            {payError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{payError}</span></div>}
            {paySuccess ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }} className="animate-fade-in">
                <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Check size={36} />
                </div>
                <h3 style={{ color: 'var(--success)' }}>Payment Successful!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Updating records. Please wait...</p>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment}>
                <div className="gateway-summary-row">
                  <span>Pay {selectedPayment["Description"]}</span>
                  <span>₹{Number(selectedPayment["Amount"]).toLocaleString('en-IN')}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: 10 }} onClick={() => setPaymentMethod('upi')}>UPI (GPay / PhonePe)</button>
                    <button type="button" className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: 10 }} onClick={() => setPaymentMethod('card')}>Card</button>
                  </div>
                </div>
                {paymentMethod === 'upi' ? (
                  <div className="form-group animate-fade-in" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Scan with any UPI app to pay</p>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${TEST_UPI_ID}&pn=Rotary%20Club&am=${selectedPayment["Amount"]}&cu=INR&tn=${selectedPayment["Description"]}`)}`} 
                      alt="UPI QR Code" 
                      style={{ width: '150px', height: '150px', borderRadius: '8px', marginBottom: '16px' }}
                    />
                    <label className="form-label" style={{ textAlign: 'left', display: 'block' }}>Transaction Reference Number (UTR)</label>
                    <input type="text" className="form-control" placeholder="e.g. 12-digit UTR from your bank app" value={utr} onChange={e => setUtr(e.target.value)} required />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <div className="form-group"><label className="form-label">Card Number</label><input type="text" maxLength={16} className="form-control" placeholder="•••• •••• •••• ••••" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required /></div>
                    <div className="form-row-grid">
                      <div className="form-group"><label className="form-label">Expiry (MM/YY)</label><input type="text" maxLength={5} className="form-control" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">CVV</label><input type="password" maxLength={3} className="form-control" placeholder="•••" value={cardCvv} onChange={e => setCardCvv(e.target.value)} required /></div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 11, margin: '20px 0' }}>
                  <ShieldAlert size={14} style={{ color: 'var(--success)' }} />
                  <span>Your connection is encrypted. This is a simulated transaction.</span>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={paying}>
                  {paying ? 'Processing...' : `Pay ₹${Number(selectedPayment["Amount"]).toLocaleString('en-IN')}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ EDIT PAYMENT MODAL ══════════════════════════════════════════════════ */}
      {showEditModal && editTarget && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <button className="drawer-close" onClick={closeEditModal} disabled={editSubmitting}><X size={24} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--rotary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pencil size={18} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Propose Payment Edit</h2>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Change requires approval from the other two committee members</p>
              </div>
            </div>

            {editError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{editError}</span></div>}

            {editSuccess ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }} className="animate-fade-in">
                <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(255,179,0,0.15)', color: 'var(--rotary-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Clock size={36} />
                </div>
                <h3 style={{ color: 'var(--rotary-blue-dark)' }}>Edit Submitted!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Awaiting approval from the other two committee members.</p>
              </div>
            ) : (
              <form onSubmit={handleProposeEdit}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)' }}>
                  Member: <strong>{editTarget["Member Name"]}</strong> · Current Amount: <strong>₹{Number(editTarget["Amount"]).toLocaleString('en-IN')}</strong>
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input type="number" min="1" className="form-control" value={editAmount} onChange={e => setEditAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input type="date" className="form-control" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Category <span style={{ color: 'var(--error)' }}>*</span></label>
                  <select className="form-control filter-select" style={{ width: '100%' }} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {PAYMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" className="form-control" value={editDescription} onChange={e => setEditDescription(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input type="text" className="form-control" placeholder="Optional internal note" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={closeEditModal} disabled={editSubmitting}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={editSubmitting}>
                    {editSubmitting ? 'Submitting...' : <><Pencil size={15} /> Submit for Approval</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ CREATE RECEIVABLE MODAL ══════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="drawer-close" onClick={closeCreateModal} disabled={creating}><X size={24} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--rotary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={20} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Create Payment Receivable</h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Raise a new due for selected members</p>
              </div>
            </div>
            {createError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{createError}</span></div>}
            {createSuccess ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }} className="animate-fade-in">
                <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Check size={36} /></div>
                <h3 style={{ color: 'var(--success)' }}>Receivables Created!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Added for {selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''}. Refreshing...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateReceivables}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}><Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Select Members <span style={{ color: 'var(--error)' }}>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setSelectedMemberIds(members.map(m => m["Member ID"]))} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--rotary-blue)', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}>All</button>
                      <button type="button" onClick={() => setSelectedMemberIds([])} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', maxHeight: 180, overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
                    {members.map(member => {
                      const isChecked = selectedMemberIds.includes(member["Member ID"]);
                      return (
                        <label key={member["Member ID"]} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', backgroundColor: isChecked ? 'rgba(0,61,165,0.05)' : 'transparent', transition: 'background-color 0.15s' }}>
                          {isChecked ? <CheckSquare size={18} color="var(--rotary-blue)" /> : <Square size={18} color="var(--text-muted)" />}
                          <input type="checkbox" style={{ display: 'none' }} checked={isChecked} onChange={() => toggleMember(member["Member ID"])} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{member["Name"]}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{member["Role"]} · {member["Classification"]}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedMemberIds.length > 0 && <p style={{ fontSize: 11, color: 'var(--rotary-blue)', marginTop: 6, fontWeight: 600 }}>{selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''} selected</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Category <span style={{ color: 'var(--error)' }}>*</span></label>
                  <select className="form-control filter-select" style={{ width: '100%' }} value={rcCategory} onChange={e => setRcCategory(e.target.value)} required>
                    {PAYMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input type="number" min="1" className="form-control" placeholder="e.g. 1500" value={rcAmount} onChange={e => setRcAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Due Date <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input type="date" className="form-control" value={rcDueDate} onChange={e => setRcDueDate(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. Membership Fee 2026" value={rcDescription} onChange={e => setRcDescription(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Link to Event (Optional)</label>
                  <select className="form-control filter-select" style={{ width: '100%' }} value={rcEventId} onChange={e => setRcEventId(e.target.value)}>
                    <option value="">— No event —</option>
                    {upcomingEvents.map(ev => <option key={ev["Event ID"]} value={ev["Event ID"]}>{ev["Event Name"]} ({ev["Date"]})</option>)}
                  </select>
                </div>
                {selectedMemberIds.length > 0 && rcAmount > 0 && (
                  <div style={{ backgroundColor: 'rgba(0,61,165,0.06)', border: '1px solid rgba(0,61,165,0.15)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: 'var(--rotary-blue-dark)' }}>Preview: </span>
                    Creating <strong>{selectedMemberIds.length}</strong> receivable{selectedMemberIds.length > 1 ? 's' : ''} of <strong>₹{Number(rcAmount).toLocaleString('en-IN')}</strong> each — total <strong>₹{(selectedMemberIds.length * Number(rcAmount)).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={closeCreateModal} disabled={creating}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={creating}>
                    {creating ? 'Creating...' : <><Plus size={16} /> Create {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} ` : ''}Receivable{selectedMemberIds.length !== 1 ? 's' : ''}</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
