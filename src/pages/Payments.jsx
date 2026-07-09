import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard, Check, ShieldAlert, Landmark, Info, X, AlertCircle,
  Plus, Users, Calendar, CheckSquare, Square, Pencil, ThumbsUp, ThumbsDown,
  ArrowRight, Clock, XCircle, Heart
} from 'lucide-react';
import { Modal } from '../components/Modal';
import './pages.css';

// Helper to load Razorpay SDK dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  const { currentUser, globalConfig } = useAuth();
  const [activeTab, setActiveTab] = useState('dues');
  const [sortField, setSortField] = useState('Due Date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('None'); // 'None', 'Member Name', 'Category'
  
  const COMMITTEE_ROLES = globalConfig?.coreCommitteeRoles || ['President', 'Secretary', 'Treasurer'];
  const PAYMENT_CATEGORIES = globalConfig?.paymentCategories || [
    'Membership Fee', 'Fellowship Drinks', 'Charity / Additional Donations',
    'Event Registration', 'District Conference Fee', 'Club Dues',
    'Project Contribution', 'Fine', 'Other'
  ];
  
  const TEST_UPI_ID = "vineethjvenattu@okhdfcbank"; // Forced for testing

  // Payment gateway state
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [waitingForUpi, setWaitingForUpi] = useState(false);
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

  // Charity modal state
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [charityAmount, setCharityAmount] = useState('');
  const [charityDescription, setCharityDescription] = useState('');
  const [charitySubmitting, setCharitySubmitting] = useState(false);
  const [charityError, setCharityError] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Payments...</div>;
  }

  const { payments = [], members = [], events = [], paymentEdits = [] } = data;

  const isCommittee = currentUser && COMMITTEE_ROLES.includes(currentUser["Role"]);
  const isFinancialAdmin = isCommittee; // All core committee members can manage payments

  const myId = String(currentUser?.["Member ID"] || currentUser?.id).trim();

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

  const sortPayments = (list) => {
    return [...list].sort((a, b) => {
      if (a["Status"] === "Verification Pending" && b["Status"] !== "Verification Pending") return -1;
      if (b["Status"] === "Verification Pending" && a["Status"] !== "Verification Pending") return 1;

      let valA, valB;
      if (sortField === 'Amount') {
        valA = Number(a["Amount"] || 0);
        valB = Number(b["Amount"] || 0);
      } else if (sortField === 'Posted Date') {
        valA = a["Payment ID"]?.startsWith("P") ? Number(a["Payment ID"].substring(1, 14)) : 0;
        valB = b["Payment ID"]?.startsWith("P") ? Number(b["Payment ID"].substring(1, 14)) : 0;
      } else {
        valA = new Date(a["Due Date"] || 0).getTime();
        valB = new Date(b["Due Date"] || 0).getTime();
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedAllDues = sortPayments(allDues);
  const sortedMyDues = sortPayments(myDues);
  const sortedAllHistory = sortPayments(allHistory);
  const sortedMyHistory = sortPayments(myHistory);

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
    
    if (paymentMethod === 'upi') {
      setPayError('');
      setWaitingForUpi(true);
      
      const res = await loadRazorpayScript();
      if (!res) {
        setPayError('Razorpay SDK failed to load. Are you online?');
        setWaitingForUpi(false);
        return;
      }
      
      // In a real production app, you would fetch an order_id from the backend here.
      // For this client-side demonstration, we use Razorpay standard checkout.
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY || "rzp_test_YourTestKeyHere", // Fallback test key
        amount: Number(selectedPayment["Amount"]) * 100, // Amount is in currency subunits (paise)
        currency: "INR",
        name: "Rotary Club",
        description: selectedPayment["Description"],
        image: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5b/Rotary_International_Seal.svg/1200px-Rotary_International_Seal.svg.png",
        handler: async function (response) {
            setWaitingForUpi(false);
            setPaying(true);
            try {
              // response.razorpay_payment_id contains the successful payment ID
              const result = await api.submitPaymentReference(selectedPayment["Payment ID"], response.razorpay_payment_id);
              if (result.success) {
                setPaySuccess(true);
                setTimeout(async () => { 
                  setSelectedPayment(null); 
                  await refreshData(); 
                  setPaySuccess(false);
                }, 2000);
              } else {
                setPayError(result.error || 'Payment transaction failed on server.');
              }
            } catch (err) {
              setPayError('Error processing payment confirmation');
            } finally {
              setPaying(false);
            }
        },
        prefill: {
            name: currentUser?.Name || "Member",
            email: currentUser?.Email || "member@rotary.org",
            contact: currentUser?.Mobile || "9999999999"
        },
        notes: {
            payment_id: selectedPayment["Payment ID"]
        },
        theme: {
            color: "#003da5"
        },
        modal: {
            ondismiss: function() {
                setWaitingForUpi(false);
            }
        }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
              setPayError("Payment Failed: " + response.error.description);
              setWaitingForUpi(false);
      });
      rzp1.open();
      
      return;
    } else if (paymentMethod === 'native_upi') {
      if (!utr || utr.length < 6) {
        setPayError('Please enter a valid Transaction ID/UTR (min 6 characters).');
        return;
      }
      setPayError('');
      setPaying(true);
      try {
        const result = await api.submitPaymentReference(selectedPayment["Payment ID"], utr);
        if (result.success) {
          setPaySuccess(true);
          setTimeout(async () => { 
            setSelectedPayment(null); 
            await refreshData(); 
            setPaySuccess(false);
            setUtr('');
          }, 2000);
        } else {
          setPayError(result.error || 'Failed to submit UTR.');
        }
      } catch (err) {
        setPayError('Error submitting reference.');
      } finally {
        setPaying(false);
      }
      return;
    }
    
    // Card flow
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvv)) { setPayError('Please fill in card details'); return; }
    setPayError('');
    setPaying(true);
    try {
      const reference = `CARD-${cardNumber.slice(-4)}`;
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

  const handleProposeWaiver = async (p) => {
    if (!window.confirm(`Propose to waive this fee of ₹${p["Amount"]} for ${p["Member Name"]}? This requires approval from the other two committee members.`)) return;
    try {
      const result = await api.proposePaymentWaiver(p["Payment ID"], p["Amount"], currentUser, members, p["Member ID"]);
      if (result.success) {
        await refreshData();
        alert('Waiver proposed successfully. Waiting for committee approval.');
      } else {
        alert("Failed to propose waiver: " + result.error);
      }
    } catch (e) {
      alert("An unexpected error occurred while proposing waiver.");
    }
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

  const handleCreateCharityDonation = async (e) => {
    e.preventDefault();
    if (!charityAmount || Number(charityAmount) <= 0) {
      setCharityError('Please enter a valid amount.');
      return;
    }
    setCharitySubmitting(true);
    setCharityError('');
    try {
      const result = await api.createCharityDonation(
        data.events[0]?.chapterId || currentUser?.chapterId || 'amity-tvm',
        myId,
        currentUser?.Name || "Member",
        charityAmount,
        charityDescription
      );
      if (result.success) {
        setShowCharityModal(false);
        setCharityAmount('');
        setCharityDescription('');
        await refreshData();
        alert("Donation entry created! Please pay it from the Dues list.");
      } else {
        setCharityError(result.error || 'Failed to create donation entry.');
      }
    } catch (err) {
      setCharityError('An error occurred.');
    } finally {
      setCharitySubmitting(false);
    }
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rotary-gold)' }} onClick={() => setShowCharityModal(true)}>
            <Heart size={16} /> Donate
          </button>
          {isFinancialAdmin && (
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={openCreateModal}>
              <Plus size={16} /> Add Receivable
            </button>
          )}
        </div>
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
            const isBusyApprove = approvalBusy === edit.id + '_approve';
            const isBusyReject = approvalBusy === edit.id + '_reject';
            return (
              <div key={edit.id} className="card" style={{ marginBottom: 12, border: '1px solid var(--rotary-gold)', borderLeft: '4px solid var(--rotary-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {edit["Type"] === "Waiver" ? "Waiver" : "Edit"} proposed by {edit["Proposed By Name"]}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      For member: <strong>{paymentLabel}</strong> · {formatDisplayDate(edit["Proposed At"])}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(edit["Required Approvers"] || []).map(rid => {
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

                {/* Diff or Waiver Details */}
                {edit["Type"] === "Waiver" ? (
                  <div style={{ backgroundColor: '#fef2f2', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', marginBottom: 12, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Proposed waiving of entire fee: ₹{Number(edit["Amount"]).toLocaleString('en-IN')}</div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', marginBottom: 12 }}>
                    <DiffRow label="Amount" oldVal={`₹${Number(edit["Original"]["Amount"]).toLocaleString('en-IN')}`} newVal={`₹${Number(edit["Changes"]["Amount"]).toLocaleString('en-IN')}`} />
                    <DiffRow label="Due Date" oldVal={formatDisplayDate(edit["Original"]["Due Date"])} newVal={formatDisplayDate(edit["Changes"]["Due Date"])} />
                    <DiffRow label="Description" oldVal={edit["Original"]["Description"]} newVal={edit["Changes"]["Description"]} />
                    {edit["Original"]["Category"] !== edit["Changes"]["Category"] && <DiffRow label="Category" oldVal={edit["Original"]["Category"]} newVal={edit["Changes"]["Category"]} />}
                    {edit["Original"]["Notes"] !== edit["Changes"]["Notes"] && <DiffRow label="Notes" oldVal={edit["Original"]["Notes"] || '—'} newVal={edit["Changes"]["Notes"] || '—'} />}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
                  <button
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 24px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                    onClick={() => handleApprove(edit.id)}
                    disabled={!!approvalBusy}
                  >
                    {isBusyApprove ? 'Processing...' : <><ThumbsUp size={15} /> Approve</>}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 24px', color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={() => handleReject(edit.id)}
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
            const isBusyCancel = approvalBusy === edit.id + '_cancel';
            const approvedCount = edit["Approvals"]?.length || 0;
            const requiredCount = edit["Required Approvers"]?.length || 0;
            return (
              <div key={edit.id} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${isRejected ? 'var(--error)' : 'var(--rotary-blue)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {edit["Type"] === "Waiver" ? "Waiver" : "Edit"} for: {paymentLabel}
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
                    onClick={() => handleCancel(edit.id)}
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

      {/* Sorting & Grouping Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {isFinancialAdmin ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Group by:</span>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '4px 8px', fontSize: '13px', minHeight: '30px' }}
            >
              <option value="None">None</option>
              <option value="Member Name">Member</option>
              <option value="Category">Receivable Type</option>
            </select>
          </div>
        ) : <div />}
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sort by:</span>
          <select 
            value={sortField} 
            onChange={(e) => setSortField(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '13px', minHeight: '30px' }}
          >
            <option value="Due Date">Due Date</option>
            <option value="Amount">Amount</option>
            <option value="Posted Date">Posted Date</option>
          </select>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '13px', minHeight: '30px', display: 'flex', alignItems: 'center' }}
          >
            {sortOrder === 'asc' ? 'Asc ↑' : 'Desc ↓'}
          </button>
        </div>
      </div>

      {/* Dues / History list */}
      <div className="payments-list">
        {(() => {
          const renderPaymentItem = (p) => {
            const pendingEdit = paymentEdits.find(e => e["Payment ID"] === p["Payment ID"] && e["Status"] === "pending");
            return (
              <div key={p["Payment ID"]} className="card payment-row-card">
                <div className="payment-row-info">
                  <div className="payment-row-title">{p["Description"]}</div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {isFinancialAdmin && `Member: ${p["Member Name"]} • `}
                    Due: {formatDisplayDate(p["Due Date"])}{p["Category"] && ` • ${p["Category"]}`}
                  </span>
                  {pendingEdit && (
                    <span style={{ fontSize: 10, color: 'var(--rotary-gold)', fontWeight: 700, background: 'rgba(255,179,0,0.12)', padding: '2px 8px', borderRadius: 10, marginTop: 2, display: 'inline-block' }}>
                      ⏳ {pendingEdit["Type"] === 'Waiver' ? 'Waiver pending approval' : 'Edit pending approval'}
                    </span>
                  )}
                </div>
                <div className="payment-row-actions">
                  <span className="payment-row-amount">₹{Number(p["Amount"]).toLocaleString('en-IN')}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {p["Status"] === "Verification Pending" ? (
                      <>
                        <span className="payment-status-badge pending" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>Verifying</span>
                        {isCommittee && p["Member ID"] !== myId && (
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
                        {isCommittee && !pendingEdit && p["Member ID"] !== myId && (
                          <>
                            <button onClick={() => openEditModal(p)} className="btn btn-secondary" style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 4 }} title="Propose an edit"><Pencil size={13} /> Edit</button>
                            <button onClick={() => handleProposeWaiver(p)} className="btn btn-secondary" style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }} title="Propose to waive this fee"><X size={13} /> Waive</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          const renderHistoryItem = (p) => (
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
          );

          const renderList = (list, isHistory) => {
            if (list.length === 0) {
              return (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {isHistory ? (
                    <><Info size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} /><p>No past payment records found.</p></>
                  ) : (
                    <><Check size={36} style={{ color: 'var(--success)', marginBottom: '12px' }} /><p>All dues are cleared. Great job!</p></>
                  )}
                </div>
              );
            }

            if (isFinancialAdmin && groupBy !== 'None') {
              const grouped = list.reduce((acc, p) => {
                const key = p[groupBy] || 'Other';
                if (!acc[key]) acc[key] = [];
                acc[key].push(p);
                return acc;
              }, {});
              
              return Object.keys(grouped).sort().map(key => (
                <div key={key} className="payment-group" style={{ marginBottom: '24px' }}>
                  <h4 style={{ 
                    padding: '10px 14px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderLeft: '4px solid var(--rotary-gold)',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    color: 'var(--text-primary)'
                  }}>
                    <span>{key}</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--rotary-blue)' }}>
                      ₹{grouped[key].reduce((sum, p) => sum + Number(p.Amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {grouped[key].map(p => isHistory ? renderHistoryItem(p) : renderPaymentItem(p))}
                  </div>
                </div>
              ));
            }

            return list.map(p => isHistory ? renderHistoryItem(p) : renderPaymentItem(p));
          };

          if (activeTab === 'dues') {
            return renderList(isFinancialAdmin ? sortedAllDues : sortedMyDues, false);
          } else {
            return renderList(isFinancialAdmin ? sortedAllHistory : sortedMyHistory, true);
          }
        })()}
      </div>

      {/* ══ PAYMENT DETAILS MODAL ═════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Rotary Checkout"
        subtitle="Secure payment gateway"
        footer={
          !paySuccess && paymentMethod !== 'native_upi' ? (
            <button type="submit" form="pay-now-form" className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={paying || waitingForUpi}>
              {paying || waitingForUpi ? 'Processing...' : (paymentMethod === 'upi' ? `Pay ₹${Number(selectedPayment?.["Amount"]).toLocaleString('en-IN')} with Razorpay` : `Pay ₹${Number(selectedPayment?.["Amount"]).toLocaleString('en-IN')}`)}
            </button>
          ) : null
        }
      >
        {payError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{payError}</span></div>}
        {paySuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }} className="animate-fade-in">
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={36} />
            </div>
            <h3 style={{ color: 'var(--success)' }}>Verification Pending</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Your payment reference has been submitted and is pending PST verification.</p>
          </div>
        ) : (
          <form id="pay-now-form" onSubmit={handleProcessPayment}>
            <div className="gateway-summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <span>Pay {selectedPayment?.["Description"]}</span>
              <span>₹{Number(selectedPayment?.["Amount"]).toLocaleString('en-IN')}</span>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Payment Method</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: 10 }} onClick={() => setPaymentMethod('upi')}>Razorpay (Cards / NetBanking / Web UPI)</button>
                <button type="button" className={`btn ${paymentMethod === 'native_upi' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: 10 }} onClick={() => setPaymentMethod('native_upi')}>Direct UPI App (GPay / Paytm / PhonePe)</button>
              </div>
            </div>
            {paymentMethod === 'native_upi' ? (
              <div className="form-group animate-fade-in" style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16 }}>Click below to instantly open GPay, Paytm, PhonePe, or other UPI apps installed on your device.</p>
                <a 
                  href={`upi://pay?pa=${TEST_UPI_ID}&pn=${encodeURIComponent(data?.chapterConfig?.Name || "Rotary Club")}&am=${Number(selectedPayment?.["Amount"]).toFixed(2)}&cu=INR&tn=${encodeURIComponent(selectedPayment?.["Description"])}`} 
                  className="btn btn-primary" 
                  style={{ display: 'block', textDecoration: 'none', marginBottom: 16, background: '#16a34a', border: 'none', padding: 14 }}
                >
                  Open Installed UPI App
                </a>
                
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 8px' }}>After paying, enter your Transaction ID (UTR) to verify:</p>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter 12-digit UTR or Reference ID" 
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    required={paymentMethod === 'native_upi'}
                    style={{ marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    disabled={paying}
                  >
                    {paying ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                </div>
              </div>
            ) : paymentMethod === 'upi' ? (
              <div className="form-group animate-fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
                {waitingForUpi ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--rotary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>Razorpay Checkout Opened</p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Please complete the payment in the secure Razorpay window.</p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>Powered by Razorpay</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click 'Pay' below to open the secure payment gateway.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="form-group"><label className="form-label">Card Number</label><input type="text" maxLength={16} className="form-control" placeholder="•••• •••• •••• ••••" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label className="form-label">Expiry (MM/YY)</label><input type="text" maxLength={5} className="form-control" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} /></div>
                  <div className="form-group"><label className="form-label">CVV</label><input type="password" maxLength={3} className="form-control" placeholder="•••" value={cardCvv} onChange={e => setCardCvv(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} /></div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 11, marginTop: '20px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--success)' }} />
              <span>Your connection is encrypted. {paymentMethod === 'upi' ? 'Payments processed securely by Razorpay.' : 'This is a simulated transaction.'}</span>
            </div>
          </form>
        )}
      </Modal>

      {/* ══ EDIT PAYMENT MODAL ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showEditModal && !!editTarget}
        onClose={closeEditModal}
        title="Propose Payment Edit"
        subtitle="Change requires approval from the other two committee members"
        footer={
          !editSuccess ? (
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={closeEditModal} disabled={editSubmitting}>Cancel</button>
              <button type="submit" form="edit-payment-form" className="btn btn-primary" style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={editSubmitting}>
                {editSubmitting ? 'Submitting...' : <><Pencil size={15} /> Submit for Approval</>}
              </button>
            </>
          ) : null
        }
      >
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
          <form id="edit-payment-form" onSubmit={handleProposeEdit}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)' }}>
              Member: <strong>{editTarget?.["Member Name"]}</strong> · Current Amount: <strong>₹{Number(editTarget?.["Amount"]).toLocaleString('en-IN')}</strong>
            </div>
            <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="number" min="1" className="form-control" value={editAmount} onChange={e => setEditAmount(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Due Date <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="date" className="form-control" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Category <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="form-control filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                {PAYMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Description <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" className="form-control" value={editDescription} onChange={e => setEditDescription(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Notes</label>
              <input type="text" className="form-control" placeholder="Optional internal note" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </form>
        )}
      </Modal>

      {/* ══ CREATE RECEIVABLE MODAL ══════════════════════════════════════════════ */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title="Create Payment Receivable"
        subtitle="Raise a new due for selected members"
        footer={
          !createSuccess ? (
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={closeCreateModal} disabled={creating}>Cancel</button>
              <button type="submit" form="create-receivable-form" className="btn btn-primary" style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={creating}>
                {creating ? 'Creating...' : <><Plus size={16} /> Create Dues</>}
              </button>
            </>
          ) : null
        }
      >
        {createError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{createError}</span></div>}
        {createSuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }} className="animate-fade-in">
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Check size={36} /></div>
            <h3 style={{ color: 'var(--success)' }}>Receivables Created!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Added for {selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''}. Refreshing...</p>
          </div>
        ) : (
          <form id="create-receivable-form" onSubmit={handleCreateReceivables}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
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
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Category <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="form-control filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={rcCategory} onChange={e => setRcCategory(e.target.value)} required>
                {PAYMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="number" min="1" className="form-control" placeholder="e.g. 1500" value={rcAmount} onChange={e => setRcAmount(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label"><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Due Date <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="date" className="form-control" value={rcDueDate} onChange={e => setRcDueDate(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Description <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" className="form-control" placeholder="e.g. Membership Fee 2026" value={rcDescription} onChange={e => setRcDescription(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Link to Event (Optional)</label>
              <select className="form-control filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={rcEventId} onChange={e => setRcEventId(e.target.value)}>
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
          </form>
        )}
      </Modal>
      {/* CHARITY MODAL */}
      <Modal
        isOpen={showCharityModal}
        onClose={() => setShowCharityModal(false)}
        title="Donate to Charity"
        subtitle="Contribute any amount to club charities"
        footer={
          <>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={() => setShowCharityModal(false)} disabled={charitySubmitting}>Cancel</button>
            <button type="submit" form="charity-donation-form" className="btn btn-primary" style={{ flex: 2, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--rotary-gold)', border: 'none', color: '#000' }} disabled={charitySubmitting}>
              {charitySubmitting ? 'Creating...' : <><Heart size={16} /> Make Donation</>}
            </button>
          </>
        }
      >
        {charityError && <div className="login-error" style={{ marginBottom: 16 }}><AlertCircle size={18} /><span>{charityError}</span></div>}
        
        <form id="charity-donation-form" onSubmit={handleCreateCharityDonation}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Donation Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="number" min="1" className="form-control" placeholder="e.g. 500" value={charityAmount} onChange={e => setCharityAmount(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Purpose / Description</label>
            <input type="text" className="form-control" placeholder="e.g. For Flood Relief Fund" value={charityDescription} onChange={e => setCharityDescription(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </form>
      </Modal>
    </div>
  );
};
