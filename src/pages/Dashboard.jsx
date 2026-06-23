import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar } from '../components/Avatar';
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
  X
} from 'lucide-react';
import './pages.css';

export const Dashboard = ({ data, loading, setActiveTab, refreshData }) => {
  const { currentUser, canMarkAttendance, isPresident, isSecretary, isTreasurer } = useAuth();
  const [projectionTab, setProjectionTab] = useState('finance');
  
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [deletionConsents, setDeletionConsents] = useState({});

  React.useEffect(() => {
    if (isPresident || isSecretary) {
      loadPending();
    }
    if (["President", "Secretary", "Treasurer"].includes(currentUser?.["Role"])) {
      loadDeletionRequests();
    }
  }, [isPresident, isSecretary, currentUser]);

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
    payments = [] 
  } = data;

  // 1. Find Next Meeting / Event
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => e["Date"] >= todayStr)
    .sort((a, b) => a["Date"].localeCompare(b["Date"]));
  const nextEvent = upcomingEvents[0];

  // 2. User's own pending tasks
  const myTasks = tasks.filter(t => 
    t["Assigned Member ID"] === currentUser?.["Member ID"] && 
    t["Status"] === "Pending"
  );

  // 3. Meeting Projection Data
  const currentMeetingId = nextEvent?.["Event ID"] || "";
  const meetingPayments = payments.filter(p => p["Event ID"] === currentMeetingId && p["Status"] === "Paid");
  const meetingTasks = tasks.filter(t => t["Event ID"] === currentMeetingId);
  const meetingMinutes = data.minutes?.find(m => m["Event ID"] === currentMeetingId);
  const meetingOpinions = opinions.filter(o => o["Event ID"] === currentMeetingId);
  const meetingProjectNotes = projectNotes.filter(pn => pn["Event ID"] === currentMeetingId);

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

  const celebratingToday = members.filter(m => {
    if (!m["Birthday"]) return false;
    const parts = String(m["Birthday"]).toLowerCase().trim().split(/\s+/);
    if (parts.length < 2) return false;
    const day = parseInt(parts[0], 10);
    const month = parts[1];
    return day === currentDay && month === currentMonthStr;
  });

  const celebratingThisMonth = celebratingToday.length > 0 ? celebratingToday : members.filter(m => {
    if (!m["Birthday"]) return false;
    const parts = String(m["Birthday"]).toLowerCase().trim().split(/\s+/);
    return parts.length >= 2 && parts[1] === currentMonthStr;
  }).slice(0, 3);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await api.updateTaskStatus(taskId, newStatus);
      await refreshData();
    } catch (err) {
      console.error(err);
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
                      onClick={() => handleToggleTask(task["Task ID"], task["Status"])}
                      style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', alignItems: 'flex-start' }}
                    >
                      <input 
                        type="checkbox" 
                        checked={false} 
                        readOnly 
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{task["Title"]}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Due: {task["Target Date"]}
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
                {celebratingThisMonth.map((member, idx) => (
                  <div key={idx} className="ticker-item">
                    <Avatar member={member} size={56} className="ticker-avatar" />
                    <div className="ticker-info">
                      <div className="ticker-name">{member["Name"]}</div>
                      <div className="ticker-desc">
                        🎂 {member["Birthday"]} {member["Anniversary"] ? `• 💍 ${member["Anniversary"]}` : ''}
                      </div>
                    </div>
                    <div className="ticker-actions">
                      <a href={`tel:${member["Mobile"]}`} className="action-btn-circle" title="Call">
                        <Phone size={14} />
                      </a>
                      <a 
                        href={`https://wa.me/91${member["Mobile"]}?text=Hi%20${encodeURIComponent(member["Name"])},%20wishing%20you%20a%20very%20Happy%20Birthday!%20Have%20a%20wonderful%20day.`} 
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
      {showOpinionModal && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '450px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="drawer-close" 
              onClick={() => setShowOpinionModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--rotary-blue-dark)', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
              {(isPresident || isSecretary) ? "Capture Member Point/Opinion" : "Raise a Point / Opinion"}
            </h2>

            {opinionError && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                <span>{opinionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOpinion}>
              {/* Member Selection (Admins only) */}
              {(isPresident || isSecretary) ? (
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '6px' }}>On Behalf of Member</label>
                  <select 
                    className="form-control"
                    value={opinionMemberId}
                    onChange={(e) => setOpinionMemberId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                  >
                    <option value="">-- Select Member --</option>
                    {members.map(m => (
                      <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Raising as</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={currentUser?.["Name"]} 
                    disabled 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
                  />
                </div>
              )}

              <div className="form-group" style={{ textAlign: 'left', marginTop: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Point / Opinion Details</label>
                <textarea 
                  className="form-control"
                  rows={4}
                  placeholder="Type the point, opinion or suggestion raised..."
                  value={opinionText}
                  onChange={(e) => setOpinionText(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Action Required Toggles (Admins only) */}
              {(isPresident || isSecretary) && (
                <>
                  <div className="form-group" style={{ textAlign: 'left', marginTop: '16px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Action Required?</label>
                    <select 
                      className="form-control"
                      value={opinionActionRequired}
                      onChange={(e) => setOpinionActionRequired(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {opinionActionRequired === 'Yes' && (
                    <div className="form-group" style={{ textAlign: 'left', marginTop: '16px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Action Details / Assignment</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="e.g. Action: Review feasibility in the next board meet"
                        value={opinionActionDetails}
                        onChange={(e) => setOpinionActionDetails(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                  onClick={() => setShowOpinionModal(false)}
                  disabled={savingOpinion}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                  disabled={savingOpinion}
                >
                  {savingOpinion ? 'Saving...' : 'Submit Point'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
