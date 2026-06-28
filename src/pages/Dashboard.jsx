import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Users, 
  CheckSquare, 
  CreditCard, 
  Bell, 
  Gift,
  FileText,
  DollarSign,
  MessageSquare,
  Briefcase,
  Check,
  Beer,
  Heart,
  X,
  ThumbsUp
} from 'lucide-react';
import './pages.css';

export const Dashboard = ({ data, loading, setActiveTab, refreshData }) => {
  const { currentUser, canMarkAttendance, isPresident, isSecretary, isTreasurer } = useAuth();
  const isPST = isPresident || isSecretary || isTreasurer;
  const [projectionTab, setProjectionTab] = useState('finance');
  
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [deletionConsents, setDeletionConsents] = useState({});
  const [pendingRelations, setPendingRelations] = useState([]);
  const [whatsNew, setWhatsNew] = useState([]);

  React.useEffect(() => {
    const unsubscribeWhatsNew = api.subscribeToWhatsNew((notifications) => {
      setWhatsNew(notifications);
    });
    
    if (isPresident || isSecretary || currentUser?.isSuperAdmin) {
      loadPending();
      loadPendingRelations();
    }
    if (["President", "Secretary", "Treasurer"].includes(currentUser?.["Role"]) || currentUser?.isSuperAdmin) {
      loadDeletionRequests();
    }
    
    return () => {
      if (unsubscribeWhatsNew) unsubscribeWhatsNew();
    };
  }, [isPresident, isSecretary, currentUser]);

  const loadPendingRelations = async () => {
    if (!currentUser?.chapterId) return;
    const result = await api.getPendingRelations(currentUser.chapterId);
    if (result.success) {
      setPendingRelations(result.pending);
    }
  };

  const formatWhatsAppText = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {lines.map((line, i) => {
          // split by regex keeping the delimiters
          const parts = line.split(/(\*.*?\*|_.*?_|~.*?~)/g);
          return (
            <li key={i} style={{ marginBottom: '4px' }}>
              {parts.map((part, j) => {
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                  return <em key={j}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
                  return <del key={j}>{part.slice(1, -1)}</del>;
                }
                return part;
              })}
            </li>
          );
        })}
      </ul>
    );
  };

  const loadPending = async () => {
    setLoadingPending(true);
    const result = await api.getPendingMembers();
    if (result.success) {
      setPendingMembers(result.pending);
    }
    setLoadingPending(false);
  };

  const loadDeletionRequests = async () => {
    if (!currentUser?.chapterId) return;
    const result = await api.getDeletionRequests(currentUser.chapterId);
    if (result.success) {
      setDeletionRequests(result.requests);
    }
  };

  const handleApproveDeletion = async (requestId) => {
    const result = await api.approveDeletionRequest(currentUser.chapterId, requestId, currentUser.Role);
    if (result.success) {
      if (result.isOrphaned) {
        alert("Member successfully deleted and orphaned.");
      } else {
        alert("Approval recorded.");
      }
      loadDeletionRequests();
      refreshData(true);
    }
  };

  const handleRejectDeletion = async (requestId) => {
    if (window.confirm("Are you sure you want to reject this deletion request?")) {
      const result = await api.rejectDeletionRequest(currentUser.chapterId, requestId);
      if (result.success) {
        alert("Deletion request rejected and cancelled.");
        loadDeletionRequests();
        refreshData(true);
      } else {
        alert("Error: " + result.error);
      }
    }
  };

  const handleApprove = async (id) => {
    await api.approveMember(id);
    loadPending();
    refreshData(true);
  };

  const handleReject = async (id) => {
    if (window.confirm("Are you sure you want to reject this registration?")) {
      await api.rejectMember(id);
      loadPending();
    }
  };

  const handleApproveRelation = async (memberId, relationIndex) => {
    await api.approveRelation(currentUser.chapterId, memberId, relationIndex);
    loadPendingRelations();
    refreshData(true);
  };

  const handleRejectRelation = async (memberId, relationIndex) => {
    if (window.confirm("Are you sure you want to reject this family relation?")) {
      await api.rejectRelation(currentUser.chapterId, memberId, relationIndex);
      loadPendingRelations();
    }
  };

  // Opinions Modal Form state
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [opinionMemberId, setOpinionMemberId] = useState(currentUser?.["Member ID"] || '');
  const [opinionText, setOpinionText] = useState('');
  const [opinionActionRequired, setOpinionActionRequired] = useState('No');
  const [opinionActionDetails, setOpinionActionDetails] = useState('');
  const [savingOpinion, setSavingOpinion] = useState(false);
  const [opinionError, setOpinionError] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Dashboard...</div>;
  }

  const { 
    members = [], 
    events = [], 
    announcements = [], 
    tasks = [], 
    projectNotes = [], 
    opinions = [], 
    payments = [],
    feedbacks = [],
    paymentEdits = []
  } = data;

  // 1. Find Next Meeting / Event
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => e["Date"] >= todayStr)
    .sort((a, b) => a["Date"].localeCompare(b["Date"]));
  const nextEvent = upcomingEvents[0];

  // 2. User's own pending tasks
  const currentUserId = String(currentUser?.["Member ID"] || currentUser?.id).trim();

  let myTasks = tasks.filter(t => 
    String(t["Assigned Member ID"]).trim() === currentUserId && 
    t["Status"] === "Pending"
  );

  const myPendingApprovals = paymentEdits.filter(e =>
    e["Status"] === "pending" && (e["Required Approvers"] || []).includes(currentUserId)
  );

  const approvalTasks = myPendingApprovals.map(e => ({
    "Task ID": e.id,
    "Title": `${e["Type"] === "Waiver" ? "Waiver" : "Edit"} Approval: ${e["Amount"] ? `₹${e["Amount"]}` : ""}`,
    "Target Date": e["Proposed At"] ? new Date(e["Proposed At"]).toLocaleDateString() : "Pending",
    "Status": "Pending",
    "isApproval": true
  }));

  myTasks = [...myTasks, ...approvalTasks];

  const myOpinionActions = opinions
    .filter(o => {
      if (o["Action Required"] !== 'Yes') return false;
      const isAssignee = String(o["Action Assignee"]).trim() === currentUserId;
      const status = o["Action Status"] || 'Pending';
      
      if (status === 'Completed') return false;
      
      if (isAssignee) return true;
      if (isPST) return true;
      
      return false;
    })
    .map(o => ({
      "Task ID": `opinion_${o["Opinion ID"]}`,
      "Title": o["Action Details"] || o["Opinion Text"],
      "Target Date": o["Meeting Date"] || "TBD",
      "Status": o["Action Status"] || "Pending",
      "isOpinionAction": true,
      "originalOpinion": o,
      "isAssignee": String(o["Action Assignee"]).trim() === currentUserId
    }));
  
  myTasks = [...myTasks, ...myOpinionActions];

  // 3. Meeting Projection Data
  const currentMeetingId = nextEvent?.["Event ID"] || "";
  const meetingPayments = payments.filter(p => p["Event ID"] === currentMeetingId && p["Status"] === "Paid");
  const meetingTasks = tasks.filter(t => t["Event ID"] === currentMeetingId);
  const meetingMinutes = data.minutes?.find(m => m["Event ID"] === currentMeetingId);
  const meetingOpinions = opinions.filter(o => o["Event ID"] === currentMeetingId && !o.isNewAction && !(o["Opinion Text"] && o["Opinion Text"].startsWith("[Action Item]")));
  const meetingProjectNotes = projectNotes.filter(pn => pn["Event ID"] === currentMeetingId);

  const myPendingDues = payments
    .filter(p => p["Member ID"] === currentUser?.["Member ID"] && p["Status"] !== "Paid" && p["Status"] !== "Waived")
    .reduce((sum, p) => sum + Number(p["Amount"] || 0), 0);
  
  const TEST_UPI_ID = data.chapterConfig?.upiId || import.meta.env.VITE_CLUB_UPI_ID || "testupi@ybl";

  const handleSaveOpinion = async (e) => {
    e.preventDefault();
    if (!currentMeetingId) {
      setOpinionError('No active meeting event found to log opinion');
      return;
    }

    const targetMemberId = (isPresident || isSecretary) ? opinionMemberId : currentUser?.["Member ID"];
    if (!targetMemberId) {
      setOpinionError('Please select a member');
      return;
    }

    if (!opinionText.trim()) {
      setOpinionError('Please fill in opinion details');
      return;
    }

    if (opinionActionRequired === 'Yes' && !opinionActionDetails.trim()) {
      setOpinionError('Please describe the action item required');
      return;
    }

    setOpinionError('');
    setSavingOpinion(true);

    const mObj = members.find(m => m["Member ID"] === targetMemberId);
    const mName = mObj ? mObj["Name"] : (currentUser?.["Name"] || "Unknown Member");

    try {
      const result = await api.addOpinion(
        currentMeetingId,
        targetMemberId,
        mName,
        opinionText,
        opinionActionRequired,
        opinionActionDetails
      );

      if (result.success) {
        setShowOpinionModal(false);
        setOpinionText('');
        setOpinionActionRequired('No');
        setOpinionActionDetails('');
        await refreshData();
      } else {
        setOpinionError(result.error || 'Failed to submit opinion');
      }
    } catch (err) {
      setOpinionError('Connection error occurred');
    } finally {
      setSavingOpinion(false);
    }
  };

  // Financial Sub-Categorisation
  const feePayments = meetingPayments.filter(p => p["Category"] === "Membership Fee");
  const drinksPayments = meetingPayments.filter(p => p["Category"] === "Fellowship Drinks");
  const charityPayments = meetingPayments.filter(p => 
    p["Category"] !== "Membership Fee" && p["Category"] !== "Fellowship Drinks"
  );

  const feeTotal = feePayments.reduce((sum, p) => sum + Number(p["Amount"]), 0);
  const drinksTotal = drinksPayments.reduce((sum, p) => sum + Number(p["Amount"]), 0);
  const drinksCount = drinksPayments.reduce((sum, p) => sum + Number(p["Quantity"] || 0), 0);
  const charityTotal = charityPayments.reduce((sum, p) => sum + Number(p["Amount"]), 0);

  // Birthdays and Anniversaries
  const today = new Date();
  const currentMonthStr = today.toLocaleString('default', { month: 'long' }).toLowerCase();
  const currentDay = today.getDate();

  const maskYear = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${day}-${month}-XXXX`;
    }
    const parts = String(dateStr).split('-');
    if (parts.length === 3) return `${parts[0]}-${parts[1]}-XXXX`;
    return "***";
  };

  const allCelebrations = [];
  members.forEach(m => {
    const parseDateStr = (dateStr) => {
      if (!dateStr) return null;
      const parts = String(dateStr).toLowerCase().trim().split(/[\s-]+/);
      if (parts.length >= 2) {
        if (parts[0].length === 4 && parts.length >= 3) {
          const mNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const monthStr = mNames[mIdx];
          // E.g., "1980-10-24"
          let day = parseInt(parts[2], 10);
          if (parts[2].includes('T')) day = parseInt(parts[2].split('T')[0], 10);
          return { day, month: monthStr };
        } else {
          return { day: parseInt(parts[0], 10), month: parts[1] };
        }
      }
      return null;
    };

    const bday = parseDateStr(m["Birthday"]);
    if (bday) {
      allCelebrations.push({
        member: m,
        title: m["Name"],
        desc: `🎂 ${maskYear(m["Birthday"])}`,
        day: bday.day,
        month: bday.month,
        mobile: m["Mobile"],
        whatsappName: m["Name"]
      });
    }

    const anniv = parseDateStr(m["Anniversary"]);
    if (anniv) {
      allCelebrations.push({
        member: m,
        title: m["Name"],
        desc: `💍 ${m["Anniversary"]}`,
        day: anniv.day,
        month: anniv.month,
        mobile: m["Mobile"],
        whatsappName: m["Name"]
      });
    }

    if (m.FamilyMembers && Array.isArray(m.FamilyMembers)) {
      m.FamilyMembers.forEach(fm => {
        const fmBday = parseDateStr(fm.birthday);
        if (fmBday) {
          allCelebrations.push({
            member: m,
            title: `${fm.name} (${fm.relation} of ${m["Name"].split(' ')[0]})`,
            desc: `🎂 ${maskYear(fm.birthday)}`,
            day: fmBday.day,
            month: fmBday.month,
            mobile: m["Mobile"],
            whatsappName: fm.name
          });
        }
      });
    }
  });

  const celebratingToday = allCelebrations.filter(c => c.day === currentDay && c.month === currentMonthStr);
  const celebratingThisMonth = celebratingToday.length > 0 ? celebratingToday : allCelebrations.filter(c => c.month === currentMonthStr).slice(0, 5);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await api.updateTaskStatus(taskId, newStatus);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOpinionAction = async (opinion, isAssignee) => {
    try {
      const currentStatus = opinion["Action Status"] || 'Pending';
      let newStatus = currentStatus;

      if (currentStatus === 'Pending' && isAssignee) {
        newStatus = 'Awaiting PST Approval';
      } else if (currentStatus === 'Awaiting PST Approval' && isPST) {
        newStatus = 'Completed';
      } else {
        return; // No valid action
      }

      await api.updateOpinionStatus(opinion["Opinion ID"], newStatus);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectOpinionAction = async (opinion, e) => {
    e.stopPropagation();
    try {
      if (isPST) {
        await api.updateOpinionStatus(opinion["Opinion ID"], "Pending");
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoteOpinion = async (opinionId) => {
    if (!currentUser?.chapterId || !currentUser?.["Member ID"]) return;
    try {
      await api.voteOpinion(currentUser.chapterId, opinionId, currentUser["Member ID"]);
      await refreshData();
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const getDaysRemaining = (targetDateStr) => {
    if (!targetDateStr) return '';
    const diffTime = new Date(targetDateStr) - new Date(todayStr);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days to go`;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header desktop-only">
        <div className="page-title">
          <h1>Good Morning,</h1>
          <p className="page-subtitle">{currentUser ? currentUser["Name"] : "Rotarian"}</p>
        </div>
      </div>

      {/* Mobile Greeting Banner */}
      <div className="dashboard-mobile-banner">
        <span className="dashboard-greeting-label">Good Morning,</span>
        <h2 className="dashboard-greeting-name">
          {currentUser ? currentUser["Name"] : "Rotarian"} 👋
        </h2>
      </div>

      <div className="dashboard-grid">
        {/* Main Column */}
        <div className="dashboard-col">
          
          {/* Pending Approvals (Admin Only) */}
          {(isPresident || isSecretary) && pendingMembers.length > 0 && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={20} color="#ef4444" />
                <h3 style={{ margin: 0, color: '#ef4444' }}>Pending Approvals ({pendingMembers.length})</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingMembers.map(member => (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{member.Name}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {member.Email} • {member.Mobile}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleReject(member.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(member.id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '12px', background: '#10b981', border: 'none' }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {pendingRelations.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Heart size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, color: '#f59e0b' }}>Pending Family Relations ({pendingRelations.length})</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingRelations.map((rel, idx) => (
                  <div key={`${rel.memberId}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{rel.name}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Relation: {rel.relation} • Mapped to: {rel.memberName}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleRejectRelation(rel.memberId, rel.relationIndex)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApproveRelation(rel.memberId, rel.relationIndex)}
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '12px', background: '#10b981', border: 'none' }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chapter Induction (President Only) */}
          {isPresident && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--rotary-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={20} color="var(--rotary-blue)" />
                <h3 style={{ margin: 0, color: 'var(--rotary-blue)' }}>Chapter Induction</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Generate a QR code or link to induct new or orphaned members into your chapter.</p>
              
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/?induct=' + currentUser.chapterId)}`} 
                  alt="Induction QR Code" 
                  style={{ width: '150px', height: '150px', borderRadius: '8px', marginBottom: '10px' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {window.location.origin + '/?induct=' + currentUser.chapterId}
                </p>
              </div>
            </div>
          )}

          {/* Deletion Requests (Core Members Only) */}
          {["President", "Secretary", "Treasurer"].includes(currentUser?.["Role"]) && deletionRequests.length > 0 && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #f97316' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={20} color="#f97316" />
                <h3 style={{ margin: 0, color: '#f97316' }}>Deletion Requests ({deletionRequests.length})</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Requires 3 core member approvals to execute.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deletionRequests.map(req => {
                  const canApprove = req.pendingApprovals?.includes(currentUser?.["Role"]);
                  const currentPendingDues = payments
                    .filter(p => String(p["Member ID"]) === String(req.userId) && p["Status"] !== "Paid" && p["Status"] !== "Waived")
                    .reduce((sum, p) => sum + Number(p["Amount"] || 0), 0);
                  const pendingDues = currentPendingDues || req.pendingDuesAmount || 0;
                  const duesText = req.duesAction === 'cleared' ? 'Dues Cleared' : 
                                   req.duesAction === 'waiver_requested' ? 'Waiver Requested' : 'No Action Specified';
                  const hasConsented = deletionConsents[req.id];
                  
                  return (
                  <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{req.userName}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Reason: {req.notes}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--error)', fontWeight: 'bold' }}>
                        Pending Dues: ₹{pendingDues.toLocaleString('en-IN')}
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--rotary-blue-dark)', fontWeight: 'bold' }}>
                        Requested Dues Action: {duesText}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                        Pending: {req.pendingApprovals?.join(', ') || 'None'}
                      </p>
                      {req.approvedBy && req.approvedBy.length > 0 && (
                        <>
                          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong>Approved By:</strong> {req.approvedBy.join(', ')}
                          </p>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                      {canApprove ? (
                        <>
                          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={!!hasConsented} 
                              onChange={(e) => setDeletionConsents({...deletionConsents, [req.id]: e.target.checked})}
                              style={{ marginTop: '2px' }}
                            />
                            <span>I consent to approve removing this member with {pendingDues > 0 ? `₹${pendingDues.toLocaleString('en-IN')} pending dues` : 'no pending dues'}</span>
                          </label>
                          <button 
                            onClick={() => handleApproveDeletion(req.id)}
                            className="btn btn-primary"
                            disabled={!hasConsented}
                            style={{ padding: '6px 10px', fontSize: '12px', background: hasConsented ? '#f97316' : '#ccc', border: 'none' }}
                          >
                            Approve Deletion
                          </button>
                          <button 
                            onClick={() => handleRejectDeletion(req.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Already Approved
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Meeting Header Card */}
          {nextEvent ? (
            <div className="card next-meeting-card" style={{ borderLeft: '4px solid var(--rotary-gold)', color: 'var(--text-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <span className="meeting-header-tag" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--rotary-blue-dark)', margin: 0 }}>
                  {getDaysRemaining(nextEvent["Date"])}
                </span>
                {currentUser && ["President", "Secretary", "Treasurer"].includes(currentUser["Role"]) && (
                  <button 
                    onClick={() => setActiveTab('meeting-console')}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--rotary-gold)', border: 'none', color: 'var(--rotary-blue-dark)' }}
                  >
                    Open Meeting Console
                  </button>
                )}
              </div>
              <h2 className="greeting-title" style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '20px' }}>
            Hello, {(currentUser?.Name || "Member").split(' ')[0]} 👋
          </h2>    <div className="meeting-details" style={{ color: 'var(--text-secondary)' }}>
                <div className="meeting-detail-item" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar size={18} style={{ color: 'var(--rotary-blue)' }} />
                  <span>{formatDisplayDate(nextEvent["Date"])}</span>
                </div>
                <div className="meeting-detail-item" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={18} style={{ color: 'var(--rotary-blue)' }} />
                  <span>{nextEvent["Time"]}</span>
                </div>
                <div className="meeting-detail-item" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin size={18} style={{ color: 'var(--rotary-blue)' }} />
                  <span>{nextEvent["Venue"]}</span>
                </div>
              </div>

              {/* Meeting Agenda & Details Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '20px' }}>
                
                {/* Left Agenda Column: Description & Notes */}
                <div>
                  <h4 style={{ color: 'var(--rotary-blue-dark)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Meeting Agenda & Notes
                  </h4>
                  <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.6', margin: 0, color: 'var(--text-primary)' }}>
                    {nextEvent?.["Description"] || "Regular weekly chapter meeting to discuss ongoing service projects, financials ledger updates, and club fellowship activities."}
                  </p>
                </div>

                {/* Right Agenda Column: Checklist / Overview */}
                <div>
                  <h4 style={{ color: 'var(--rotary-blue-dark)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Workspace Activity Checklist
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Check size={14} style={{ color: 'var(--rotary-blue)' }} />
                      <span>Log minutes & member attendance</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Check size={14} style={{ color: 'var(--rotary-blue)' }} />
                      <span>Review outstanding payments & dues ledger</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Check size={14} style={{ color: 'var(--rotary-blue)' }} />
                      <span>Discuss {meetingOpinions.length} logged member suggestions</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Check size={14} style={{ color: 'var(--rotary-blue)' }} />
                      <span>{meetingTasks.length} active action items pending review</span>
                    </li>
                  </ul>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setActiveTab('events')} 
                  className="btn btn-secondary"
                >
                  View Details
                </button>
              </div>
            </div>
          ) : (
            <div className="card next-meeting-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
              <h3>No Upcoming Meetings Scheduled</h3>
            </div>
          )}

          {/* MEETING LIVE DASHBOARD PROJECTION */}
          {nextEvent && (
            <div className="card">
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                  📺 Meeting Live Projection
                </span>
                <span className="meeting-header-tag" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', margin: 0, textTransform: 'none' }}>
                  Active Meeting: {nextEvent["Event Name"]}
                </span>
              </div>

              <div className="tab-container" style={{ margin: '16px 0 20px', gap: '8px' }}>
                <button 
                  onClick={() => setProjectionTab('finance')} 
                  className={`tab-btn ${projectionTab === 'finance' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  💰 Financial Collections
                </button>
                <button 
                  onClick={() => setProjectionTab('minutes')} 
                  className={`tab-btn ${projectionTab === 'minutes' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  📝 Minutes & Discussions
                </button>
                <button 
                  onClick={() => setProjectionTab('projects')} 
                  className={`tab-btn ${projectionTab === 'projects' ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  💼 Service Projects
                </button>
              </div>

              {/* A. FINANCIAL COLLECTIONS PROJECTION */}
              {projectionTab === 'finance' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Categorised Summary Boxes */}
                  <div className="projection-stats-grid">
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rotary-blue-dark)' }}>₹{feeTotal}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Membership Fees</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rotary-gold-dark)' }}>₹{drinksTotal}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Fellowship Drinks ({drinksCount})</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>₹{charityTotal}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Charity / Additional</div>
                    </div>
                  </div>

                  {/* Itemised lists */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* 1. Membership Fees Block */}
                    <div style={{ borderLeft: '3px solid var(--rotary-blue)', paddingLeft: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-blue-dark)', marginBottom: '8px' }}>Membership Fee collections</h4>
                      {feePayments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {feePayments.map(p => (
                            <div key={p["Payment ID"]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                              <span>{p["Member Name"]} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({p["Notes"]})</span></span>
                              <span style={{ fontWeight: 600 }}>₹{p["Amount"]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No membership fee collections recorded in this meeting.</p>
                      )}
                    </div>

                    {/* 2. Fellowship Drinks Block */}
                    <div style={{ borderLeft: '3px solid var(--rotary-gold)', paddingLeft: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-gold-dark)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Beer size={14} /> Fellowship Drinks collections
                      </h4>
                      {drinksPayments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {drinksPayments.map(p => (
                            <div key={p["Payment ID"]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                              <span>
                                {p["Member Name"]} <span style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>x{p["Quantity"]} drinks</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '6px' }}>({p["Notes"]})</span>
                              </span>
                              <span style={{ fontWeight: 600 }}>₹{p["Amount"]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No drinks tabs logged in this meeting.</p>
                      )}
                    </div>

                    {/* 3. Charity Block */}
                    <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={14} /> Charity & Project Contributions
                      </h4>
                      {charityPayments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {charityPayments.map(p => (
                            <div key={p["Payment ID"]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                              <span>{p["Member Name"]} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({p["Notes"]})</span></span>
                              <span style={{ fontWeight: 600 }}>₹{p["Amount"]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No additional charity collections recorded in this meeting.</p>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* B. MINUTES & DISCUSSION PROJECTION */}
              {projectionTab === 'minutes' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* General Minutes Block */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-blue-dark)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> General Meeting Minutes
                    </h4>
                    {meetingMinutes ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {meetingMinutes["Notes"]}
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px' }}>No meeting minutes recorded yet.</p>
                    )}
                  </div>

                  {/* Discussion Opinions Block */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-blue-dark)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <MessageSquare size={14} /> Points Raised by Members
                      </h4>
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                        onClick={() => {
                          setOpinionMemberId(currentUser?.["Member ID"] || '');
                          setOpinionText('');
                          setOpinionActionRequired('No');
                          setOpinionActionDetails('');
                          setOpinionError('');
                          setShowOpinionModal(true);
                        }}
                      >
                        + Raise a Point
                      </button>
                    </div>
                    {meetingOpinions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {meetingOpinions.map(o => (
                          <div key={o["Opinion ID"]} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--border-radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              <span>👤 {o["Member Name"]}</span>
                              {o["Action Required"] === 'Yes' && (
                                <span style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                                  ACTION REQUIRED
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>
                              "{o["Opinion Text"]}"
                            </p>
                            {o["Action Required"] === 'Yes' && o["Action Details"] && (
                              <div style={{ fontSize: '11px', color: 'var(--error)', fontWeight: 500, marginTop: '4px', borderLeft: '2px solid var(--error)', paddingLeft: '6px' }}>
                                {o["Action Details"]}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '8px' }}>
                              <button 
                                onClick={() => handleVoteOpinion(o["Opinion ID"])}
                                style={{ 
                                  background: 'transparent', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '20px', 
                                  padding: '2px 8px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: (o.votes || []).includes(currentUser?.["Member ID"]) ? 'var(--primary)' : 'var(--text-secondary)',
                                  borderColor: (o.votes || []).includes(currentUser?.["Member ID"]) ? 'var(--primary)' : 'var(--border-color)'
                                }}
                              >
                                <ThumbsUp size={12} /> 
                                {(o.votes || []).length > 0 ? (o.votes || []).length : 'Vote'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px' }}>No discussion points logged in this meeting.</p>
                    )}
                  </div>

                </div>
              )}

              {/* C. SERVICE PROJECTS PROJECTION */}
              {projectionTab === 'projects' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-blue-dark)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} /> Service Project Updates
                  </h4>

                  {meetingProjectNotes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {meetingProjectNotes.map(pn => (
                        <div key={pn["Project Note ID"]} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--rotary-blue-dark)' }}>{pn["Project Name"]}</span>
                            <span className={`event-type-pill ${pn["Status"] === 'Completed' ? 'service' : 'social'}`} style={{ fontSize: '9px' }}>
                              {pn["Status"]}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {pn["Notes"]}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px' }}>No project status notes logged in this meeting.</p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Admin Club UPI QR Code */}
          {["President", "Secretary", "Treasurer"].includes(currentUser?.["Role"]) && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <DollarSign size={20} color="var(--success)" />
                <h3 style={{ margin: 0, color: 'var(--success)' }}>Club UPI QR Code</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Have members scan this for direct payments to the club account.</p>
              
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${TEST_UPI_ID}&pn=Rotary%20Club&cu=INR`)}`} 
                  alt="Club UPI QR Code" 
                  style={{ width: '150px', height: '150px', borderRadius: '8px', marginBottom: '10px' }}
                />
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  UPI ID: {TEST_UPI_ID}
                </p>
              </div>
            </div>
          )}

          {/* Member Pending Dues Alert */}
          {myPendingDues > 0 && (
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444', backgroundColor: 'var(--error-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#ef4444', fontSize: '15px' }}>Pending Dues</h3>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ef4444' }}>
                    ₹{myPendingDues.toLocaleString('en-IN')}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('payments')}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ef4444', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Shortcuts Grid */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Quick Actions</h3>
            <div className="quick-actions-grid">
              <div className="quick-action-card" onClick={() => setActiveTab('members')}>
                <Users size={24} style={{ color: 'var(--rotary-blue)' }} />
                <span>Members</span>
              </div>
              <div className="quick-action-card" onClick={() => setActiveTab('events')}>
                <Calendar size={24} style={{ color: 'var(--rotary-gold)' }} />
                <span>Events</span>
              </div>
              {canMarkAttendance && (
                <div className="quick-action-card" onClick={() => setActiveTab('attendance')}>
                  <CheckSquare size={24} style={{ color: 'var(--success)' }} />
                  <span>Attendance</span>
                </div>
              )}
              <div className="quick-action-card" onClick={() => setActiveTab('payments')}>
                <CreditCard size={24} style={{ color: 'var(--rotary-blue-light)' }} />
                <span>Payments</span>
              </div>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="card">
            <div className="card-title">
              <Bell size={20} style={{ color: 'var(--rotary-blue)' }} />
              Recent Announcements
            </div>
            {announcements.length > 0 ? (
              <div className="announcements-feed" style={{ gap: '16px' }}>
                {announcements.slice(0, 2).map((notice, idx) => (
                  <div key={idx} style={{ paddingBottom: '16px', borderBottom: idx === 0 && announcements.length > 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <h4 style={{ fontWeight: '600', fontSize: '15px', color: 'var(--rotary-blue-dark)' }}>{notice["Title"]}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                      {notice["Content"]}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>By: {notice["Created By"]}</span>
                      <span>{notice["Date"]}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No announcements posted.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="dashboard-col">
          
          {/* MY TASKS / ACTION ITEMS CHECKLIST CARD */}
          {currentUser && (
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={18} style={{ color: 'var(--success)' }} />
                  My Action Items
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                  {myTasks.length} Pending
                </span>
              </div>

              {myTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myTasks.map(task => (
                    <div 
                      key={task["Task ID"]}
                      style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', alignItems: 'flex-start' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                          {task["Title"]}
                          {task.Status === 'Completed' && (
                            <span style={{ fontSize: '10px', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '10px' }}>
                              Completed
                            </span>
                          )}
                          {(!task.Status || task.Status === 'Pending') && (
                            <span style={{ fontSize: '10px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '10px' }}>
                              Pending
                            </span>
                          )}
                          {task.Status === 'Awaiting PST Approval' && (
                            <span style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '10px' }}>
                              Awaiting Approval
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {task["Target Date"]} 
                          {task.originalMeetingDate && ` (Meeting: ${task.originalMeetingDate})`}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                          {task.isApproval ? (
                            <button onClick={() => setActiveTab('payments')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--rotary-blue)' }}>
                              Go to Payments
                            </button>
                          ) : task.isOpinionAction ? (
                            <>
                              {(!task["Status"] || task["Status"] === 'Pending') && task.isAssignee && (
                                <button onClick={() => handleToggleOpinionAction(task.originalOpinion, task.isAssignee)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
                                  Mark Complete
                                </button>
                              )}
                              {task["Status"] === 'Awaiting PST Approval' && isPST && (
                                <>
                                  <button onClick={() => handleToggleOpinionAction(task.originalOpinion, task.isAssignee)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
                                    Approve
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOpinionAction(task.originalOpinion, e); }} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                    Reject
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {task["Status"] !== 'Completed' && (
                                <button onClick={() => handleToggleTask(task["Task ID"], task["Status"])} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
                                  Mark Complete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                  No pending action items assigned to you.
                </p>
              )}
            </div>
          )}

          {/* Birthdays & Anniversaries Ticker Card */}
          <div className="card ticker-card">
            <div className="card-title" style={{ marginBottom: '16px' }}>
              <Gift size={20} style={{ color: 'var(--rotary-gold)' }} />
              Birthdays & Anniversaries
            </div>

            {celebratingThisMonth.length > 0 ? (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                  {celebratingToday.length > 0 ? "Celebrating Today! 🎉" : `Celebrating in ${today.toLocaleString('default', { month: 'long' })}`}
                </p>
                {celebratingThisMonth.map((celebration, idx) => (
                  <div key={idx} className="ticker-item">
                    <Avatar member={celebration.member} size={56} className="ticker-avatar" />
                    <div className="ticker-info">
                      <div className="ticker-name">{celebration.title}</div>
                      <div className="ticker-desc">
                        {celebration.desc}
                      </div>
                    </div>
                    <div className="ticker-actions">
                      <a href={`tel:${celebration.mobile}`} className="action-btn-circle" title="Call">
                        <Phone size={14} />
                      </a>
                      <a 
                        href={`https://wa.me/91${celebration.mobile}?text=Hi%20${encodeURIComponent(celebration.whatsappName)},%20wishing%20you%20a%20very%20Happy%20Celebration!%20Have%20a%20wonderful%20day.`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="action-btn-circle" 
                        title="WhatsApp"
                        style={{ color: '#25D366' }}
                      >
                        <MessageCircle size={14} fill="#25D366" stroke="none" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No celebrations this month.</p>
            )}
          </div>
        </div>
      </div>

      {/* OPINION SUBMISSION MODAL */}
      <Modal
        isOpen={showOpinionModal}
        onClose={() => setShowOpinionModal(false)}
        title={(isPresident || isSecretary) ? "Capture Member Point/Opinion" : "Raise a Point / Opinion"}
      >
        {opinionError && (
          <div className="login-error" style={{ marginBottom: '16px' }}>
            <span>{opinionError}</span>
          </div>
        )}

        <form onSubmit={handleSaveOpinion}>
          {/* Member Selection (Admins only) */}
          {(isPresident || isSecretary) ? (
            <div className="form-group">
              <label className="form-label">On Behalf of Member</label>
              <select 
                className="form-control"
                value={opinionMemberId}
                onChange={(e) => setOpinionMemberId(e.target.value)}
              >
                <option value="">-- Select Member --</option>
                {members.map(m => (
                  <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Raising as</label>
              <input 
                type="text" 
                className="form-control" 
                value={currentUser?.["Name"]} 
                disabled 
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Point / Opinion Details</label>
            <textarea 
              className="form-control"
              rows={4}
              placeholder="Type the point, opinion or suggestion raised..."
              value={opinionText}
              onChange={(e) => setOpinionText(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Action Required Toggles (Admins only) */}
          {(isPresident || isSecretary) && (
            <>
              <div className="form-group">
                <label className="form-label">Action Required?</label>
                <select 
                  className="form-control"
                  value={opinionActionRequired}
                  onChange={(e) => setOpinionActionRequired(e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {opinionActionRequired === 'Yes' && (
                <div className="form-group">
                  <label className="form-label">Action Details / Assignment</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Action: Review feasibility in the next board meet"
                    value={opinionActionDetails}
                    onChange={(e) => setOpinionActionDetails(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setShowOpinionModal(false)}
              disabled={savingOpinion}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={savingOpinion}
            >
              {savingOpinion ? 'Saving...' : 'Submit Point'}
            </button>
          </div>
        </form>
      </Modal>

      {/* WHAT'S NEW SECTION */}
      {whatsNew && whatsNew.length > 0 && (
        <div className="card whats-new-card" style={{ marginTop: '24px', padding: '24px', borderRadius: '16px', background: 'linear-gradient(to right, var(--bg-primary), var(--rotary-blue-light))', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'var(--rotary-gold)', padding: '8px', borderRadius: '50%', color: 'white' }}>
              <Bell size={20} />
            </div>
            <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>What's new in this release</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {whatsNew.slice(0, 2).map((wn) => (
              <div key={wn.id} style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--rotary-blue)' }}>{wn.title}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {new Date(wn.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {formatWhatsAppText(wn.content)}
              </div>
            ))}
          </div>
          {whatsNew.length > 2 && (
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '16px', padding: '10px' }}
              onClick={() => setActiveTab('whatsnew')}
            >
              More...
            </button>
          )}
        </div>
      )}
    </div>
  );
};
