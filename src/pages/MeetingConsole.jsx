import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  FileText, 
  DollarSign, 
  CheckSquare, 
  MessageSquare, 
  Briefcase, 
  Plus, 
  Check, 
  Clock, 
  User, 
  Save, 
  Beer, 
  Calendar,
  AlertCircle,
  ThumbsUp,
  X
} from 'lucide-react';
import { Modal } from '../components/Modal';
import './pages.css';

export const MeetingConsole = ({ data, loading, refreshData }) => {
  const { currentUser, isPresident, isSecretary, isTreasurer } = useAuth();
  
  const { members = [], events = [], tasks = [], projectNotes = [], opinions = [], payments = [] } = data;

  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('minutes');
  
  // 1. Minutes state
  const [minutesText, setMinutesText] = useState('');
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [minutesSuccess, setMinutesSuccess] = useState(false);

  // 2. Financials state
  const [payMemberId, setPayMemberId] = useState('');
  const [payCategory, setPayCategory] = useState('Membership Fee');
  const [payQuantity, setPayQuantity] = useState(1);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // 3. Action Items state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskTargetDate, setTaskTargetDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState(false);
  const [taskError, setTaskError] = useState('');

  // 4. Project Review state
  const [projEventId, setProjEventId] = useState('');
  const [projNotesText, setProjNotesText] = useState('');
  const [projStatus, setProjStatus] = useState('Upcoming');
  const [savingProjectNote, setSavingProjectNote] = useState(false);
  const [projectSuccess, setProjectSuccess] = useState(false);
  const [projectError, setProjectError] = useState('');

  // 5. Opinions state
  const [opinionMemberId, setOpinionMemberId] = useState('');
  const [opinionText, setOpinionText] = useState('');
  const [opinionActionRequired, setOpinionActionRequired] = useState('No');
  const [opinionActionDetails, setOpinionActionDetails] = useState('');
  const [opinionActionAssignee, setOpinionActionAssignee] = useState('');
  const [savingOpinion, setSavingOpinion] = useState(false);
  const [opinionError, setOpinionError] = useState('');
  const [opinionSuccess, setOpinionSuccess] = useState(false);
  const [showOpinionModal, setShowOpinionModal] = useState(false);

  // Action Item Conversion State
  const [convertingOpinion, setConvertingOpinion] = useState(null);
  const [convertActionDetails, setConvertActionDetails] = useState('');
  const [convertActionAssignee, setConvertActionAssignee] = useState('');
  const [convertingLoading, setConvertingLoading] = useState(false);
  const [convertError, setConvertError] = useState('');

  // Modification Workflow State
  const [editingOpinion, setEditingOpinion] = useState(null);
  const [editProposedText, setEditProposedText] = useState('');
  const [editProposedDetails, setEditProposedDetails] = useState('');
  const [editModLoading, setEditModLoading] = useState(false);
  const [editModError, setEditModError] = useState('');

  // Initialize selected event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      // Find closest event (usually a Meeting type)
      const meetingsOnly = events.filter(e => e["Type"] === "Meeting");
      const targetList = meetingsOnly.length > 0 ? meetingsOnly : events;
      const todayStr = new Date().toISOString().split('T')[0];
      const closest = targetList.find(e => e["Date"] >= todayStr) || targetList[0];
      setSelectedEventId(closest["Event ID"]);
    }
  }, [events, selectedEventId]);

  // Load minutes if already exist
  useEffect(() => {
    if (selectedEventId) {
      const minutesRecord = data.minutes?.find(m => m["Event ID"] === selectedEventId);
      setMinutesText(minutesRecord ? minutesRecord["Notes"] : '');
      setMinutesSuccess(false);
      setPaymentSuccess(false);
      setTaskSuccess(false);
      setProjectSuccess(false);
      setOpinionSuccess(false);
      setPaymentError('');
      setTaskError('');
      setProjectError('');
      setOpinionError('');
    }
  }, [selectedEventId, data.minutes]);

  // Calculate dynamic Fellowship Drinks cost (₹200/drink)
  useEffect(() => {
    if (payCategory === 'Fellowship Drinks') {
      setPayAmount(String(payQuantity * 200));
    } else if (payCategory === 'Membership Fee') {
      setPayAmount('1500'); // Standard membership due amount
    } else {
      setPayAmount('');
    }
  }, [payCategory, payQuantity]);

  if (!isPresident && !isSecretary && !isTreasurer) {
    return (
      <div className="content-area animate-fade-in">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={36} style={{ color: 'var(--error)', marginBottom: '12px' }} />
          <h3>Access Denied</h3>
          <p>Only the President, Secretary, and Treasurer are authorized to use the Meeting Console.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Meeting Workspace...</div>;
  }

  const selectedEvent = events.find(e => e["Event ID"] === selectedEventId);
  let meetingTasks = tasks.filter(t => t["Event ID"] === selectedEventId);
  
  const globalOpinionActions = opinions
    .filter(o => o["Action Required"] === 'Yes')
    .sort((a, b) => new Date(b["Opinion Date"] || 0) - new Date(a["Opinion Date"] || 0));

  const activeGlobalActions = globalOpinionActions.filter(o => 
    !o["Action Status"] || o["Action Status"] === 'Pending' || o["Action Status"] === 'Awaiting PST Approval'
  );
  
  const completedGlobalActions = globalOpinionActions
    .filter(o => o["Action Status"] === 'Completed')
    .slice(0, 5); // recent 5 completed

  const meetingOpinions = opinions.filter(o => o["Event ID"] === selectedEventId && !o.isNewAction && !(o["Opinion Text"] && o["Opinion Text"].startsWith("[Action Item]")));

  const meetingOpinionActions = [...activeGlobalActions, ...completedGlobalActions]
    .sort((a, b) => new Date(b["Timestamp"]) - new Date(a["Timestamp"]))
    .map(o => ({
      "Task ID": `opinion_${o["Opinion ID"]}`,
      "Title": o["Action Details"] || o["Opinion Text"],
      "Assigned Member ID": o["Action Assignee"],
      "Assigned Member Name": members.find(m => m["Member ID"] === o["Action Assignee"])?.["Name"] || o["Action Assignee"],
      "Target Date": o["Meeting Date"] || "TBD",
      "Status": o["Action Status"] || "Pending",
      "isOpinionAction": true,
      "originalOpinion": o,
      "isAssignee": String(o["Action Assignee"]).trim() === currentUser?.["Member ID"],
      "originalMeetingDate": o["Meeting Date"] // keep track for tag
    }));
  
  meetingTasks = [...meetingTasks, ...meetingOpinionActions];

  const meetingPayments = payments.filter(p => p["Event ID"] === selectedEventId);
  const serviceProjects = events.filter(e => e["Type"] === "Service");

  // General Minutes Save
  const handleSaveMinutes = async () => {
    if (!selectedEventId || !minutesText.trim()) return;
    setSavingMinutes(true);
    setMinutesSuccess(false);
    try {
      const result = await api.addMinute(
        selectedEventId,
        minutesText,
        currentUser ? currentUser["Name"] : "Secretary"
      );
      if (result.success) {
        setMinutesSuccess(true);
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMinutes(false);
    }
  };

  // Log Payment Collection
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payMemberId || !payAmount || !payNotes.trim()) {
      setPaymentError('Please fill in all fields. Notes are mandatory.');
      return;
    }

    setPaymentError('');
    setPaymentSuccess(false);
    setRecordingPayment(true);

    const member = members.find(m => m["Member ID"] === payMemberId);
    const memberName = member ? member["Name"] : "Unknown Member";

    try {
      const result = await api.recordMeetingPayment(
        selectedEventId,
        payMemberId,
        memberName,
        payCategory,
        payCategory === 'Fellowship Drinks' ? payQuantity : 0,
        Number(payAmount),
        payNotes
      );

      if (result.success) {
        setPaymentSuccess(true);
        setPayMemberId('');
        setPayNotes('');
        setPayQuantity(1);
        await refreshData();
      } else {
        setPaymentError(result.error || 'Failed to record payment');
      }
    } catch (err) {
      setPaymentError('Connection error during recording');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Add Action Item
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !taskAssigneeId || !taskTargetDate) {
      setTaskError('Please fill in all required task fields');
      return;
    }

    setTaskError('');
    setTaskSuccess(false);
    setAddingTask(true);

    const member = members.find(m => m["Member ID"] === taskAssigneeId);
    const memberName = member ? member["Name"] : "Unknown Member";

    try {
      const result = await api.addTask(
        selectedEventId,
        taskTitle,
        taskDesc,
        taskAssigneeId,
        memberName,
        taskTargetDate
      );

      if (result.success) {
        setTaskSuccess(true);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssigneeId('');
        setTaskTargetDate('');
        await refreshData();
      } else {
        setTaskError(result.error || 'Failed to add task');
      }
    } catch (err) {
      setTaskError('Connection error while adding task');
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await api.updateTaskStatus(taskId, newStatus);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOpinionActionStatus = async (opinion, currentStatus, isAssignee) => {
    try {
      let newStatus = currentStatus;

      if (currentStatus === 'Pending' && isAssignee) {
        newStatus = 'Awaiting PST Approval';
      } else if (currentStatus === 'Awaiting PST Approval' && (isPresident || isSecretary || isTreasurer)) {
        newStatus = 'Completed';
      } else {
        return; // No valid action or permission
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
      if (isPresident || isSecretary || isTreasurer) {
        await api.updateOpinionStatus(opinion["Opinion ID"], "Pending");
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Service Project Status Update
  const handleSaveProjectNote = async (e) => {
    e.preventDefault();
    if (!projEventId || !projNotesText.trim()) {
      setProjectError('Please select a project and provide update notes');
      return;
    }

    setProjectError('');
    setProjectSuccess(false);
    setSavingProjectNote(true);

    const project = events.find(e => e["Event ID"] === projEventId);
    const projectName = project ? project["Event Name"] : "Unknown Project";

    try {
      const result = await api.addProjectNote(
        selectedEventId,
        projEventId,
        projectName,
        projNotesText,
        projStatus
      );

      if (result.success) {
        setProjectSuccess(true);
        setProjEventId('');
        setProjNotesText('');
        await refreshData();
      } else {
        setProjectError(result.error || 'Failed to record project update');
      }
    } catch (err) {
      setProjectError('Connection error during recording');
    } finally {
      setSavingProjectNote(false);
    }
  };

  // Save Member Opinion
  const handleConvertActionItem = async (e) => {
    e.preventDefault();
    if (!convertingOpinion) return;
    
    if (!convertActionDetails.trim() || !convertActionAssignee) {
      setConvertError('Please provide details and select an assignee.');
      return;
    }

    setConvertError('');
    setConvertingLoading(true);

    try {
      let result;
      if (convertingOpinion.isNew) {
        result = await api.addOpinion(
          selectedEventId,
          currentUser["Member ID"],
          currentUser["Name"],
          "[Action Item] " + convertActionDetails,
          "Yes",
          convertActionDetails,
          convertActionAssignee
        );
      } else {
        result = await api.updateOpinionAction(
          convertingOpinion["Opinion ID"],
          convertActionDetails,
          convertActionAssignee
        );
      }

      if (result.success) {
        setConvertingOpinion(null);
        setConvertActionDetails('');
        setConvertActionAssignee('');
        refreshData && refreshData(); // refresh data
      } else {
        setConvertError(result.error || 'Failed to update action item.');
      }
    } catch (err) {
      setConvertError('An error occurred.');
    } finally {
      setConvertingLoading(false);
    }
  };

  const handleSaveOpinion = async (e) => {
    e.preventDefault();
    if (!opinionMemberId || !opinionText.trim()) {
      setOpinionError('Please select a member and enter their points/opinions');
      return;
    }

    if (opinionActionRequired === 'Yes') {
      if (!opinionActionDetails.trim()) {
        setOpinionError('Please describe the action item required');
        return;
      }
      if (!opinionActionAssignee) {
        setOpinionError('Please assign this action item to a member');
        return;
      }
    }

    setOpinionError('');
    setOpinionSuccess(false);
    setSavingOpinion(true);

    const member = members.find(m => m["Member ID"] === opinionMemberId);
    const memberName = member ? member["Name"] : "Unknown Member";

    try {
      const result = await api.addOpinion(
        selectedEventId,
        opinionMemberId,
        memberName,
        opinionText,
        opinionActionRequired,
        opinionActionRequired === 'Yes' ? opinionActionDetails : '',
        opinionActionRequired === 'Yes' ? opinionActionAssignee : null
      );

      if (result.success) {
        setOpinionSuccess(true);
        setOpinionText('');
        setOpinionActionRequired('No');
        setOpinionActionDetails('');
        setOpinionActionAssignee('');
        setTimeout(() => setOpinionSuccess(false), 3000);
        setShowOpinionModal(false);
        refreshData && refreshData();
      } else {
        setOpinionError(result.error || 'Failed to record opinion');
      }
    } catch (err) {
      console.error("Opinion save error:", err);
      setOpinionError('Connection error during recording: ' + err.message);
    } finally {
      setSavingOpinion(false);
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

  // Modification Handlers
  const handleRequestDelete = async (opinionId) => {
    if (!window.confirm("Are you sure you want to request deletion of this item? Another PST member will need to approve it.")) return;
    await api.requestDeleteOpinion(opinionId, currentUser["Member ID"], currentUser["Name"]);
    await refreshData();
  };

  const handleApproveDelete = async (opinionId) => {
    await api.approveDeleteOpinion(opinionId, currentUser["Member ID"]);
    await refreshData();
  };

  const handleRejectDelete = async (opinionId) => {
    await api.rejectDeleteOpinion(opinionId);
    await refreshData();
  };

  const handleRequestEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOpinion) return;
    setEditModError('');
    setEditModLoading(true);
    try {
      const result = await api.requestEditOpinion(
        editingOpinion["Opinion ID"],
        currentUser["Member ID"],
        currentUser["Name"],
        editProposedText,
        editProposedDetails
      );
      if (result.success) {
        setEditingOpinion(null);
        await refreshData();
      } else {
        setEditModError(result.error);
      }
    } catch (err) {
      setEditModError(err.toString());
    } finally {
      setEditModLoading(false);
    }
  };

  const handleApproveEdit = async (opinionId) => {
    await api.approveEditOpinion(opinionId, currentUser["Member ID"]);
    await refreshData();
  };

  const handleRejectEdit = async (opinionId) => {
    await api.rejectEditOpinion(opinionId);
    await refreshData();
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Weekly Meeting Workspace</h1>
          <p className="page-subtitle">Log minutes, opinions, task assignments, and fee sheets</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Selector Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Active Chapter Meeting</label>
            <select
              className="form-control"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 12px' }}
            >
              <option value="">-- Choose Meeting --</option>
              {events.filter(e => e["Type"] === "Meeting").map((e) => (
                <option key={e["Event ID"]} value={e["Event ID"]}>
                  {e["Event Name"]} ({e["Date"]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEventId && selectedEvent && (
          <div className="dashboard-grid">
            
            {/* Active Workspace Form Panel */}
            <div className="dashboard-col" style={{ gap: '20px' }}>
              
              {/* Workspace Navigation Bar */}
              <div className="tab-container" style={{ margin: 0 }}>
                <button 
                  onClick={() => setActiveSubTab('minutes')} 
                  className={`tab-btn ${activeSubTab === 'minutes' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={14} /> Minutes
                </button>
                <button 
                  onClick={() => setActiveSubTab('financials')} 
                  className={`tab-btn ${activeSubTab === 'financials' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DollarSign size={14} /> Payments
                </button>
                <button 
                  onClick={() => setActiveSubTab('tasks')} 
                  className={`tab-btn ${activeSubTab === 'tasks' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckSquare size={14} /> Action Items
                </button>
                <button 
                  onClick={() => setActiveSubTab('projects')} 
                  className={`tab-btn ${activeSubTab === 'projects' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Briefcase size={14} /> Projects
                </button>
                <button 
                  onClick={() => setActiveSubTab('opinions')} 
                  className={`tab-btn ${activeSubTab === 'opinions' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageSquare size={14} /> Discussions
                </button>
              </div>

              {/* Form Contents */}
              <div className="card">
                
                {/* 1. MINUTES PANEL */}
                {activeSubTab === 'minutes' && (
                  <div className="animate-fade-in">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--rotary-blue-dark)' }}>
                      Record Meeting Minutes
                    </h3>
                    
                    {minutesSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Minutes saved successfully!</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Minutes Description / Notes</label>
                      <textarea
                        className="form-control"
                        style={{ height: '260px', resize: 'none', lineHeight: '1.6' }}
                        placeholder="Detail the key summaries, speaker details, and meeting updates..."
                        value={minutesText}
                        onChange={(e) => setMinutesText(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleSaveMinutes}
                      disabled={savingMinutes}
                    >
                      <Save size={16} />
                      {savingMinutes ? 'Saving...' : 'Save Minutes'}
                    </button>
                  </div>
                )}

                {/* 2. FINANCIALS PANEL */}
                {activeSubTab === 'financials' && (
                  <form onSubmit={handleRecordPayment} className="animate-fade-in">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--rotary-blue-dark)' }}>
                      Record Meeting Dues & Collections
                    </h3>

                    {paymentError && (
                      <div className="login-error" style={{ marginBottom: '16px' }}>
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Payment recorded successfully!</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Paying Member *</label>
                      <select
                        className="form-control"
                        value={payMemberId}
                        onChange={(e) => setPayMemberId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Member --</option>
                        {members.map(m => (
                          <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]} ({m["Role"]})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Category *</label>
                      <select
                        className="form-control"
                        value={payCategory}
                        onChange={(e) => {
                          setPayCategory(e.target.value);
                          setPayQuantity(1);
                        }}
                      >
                        <option value="Membership Fee">Membership Dues / Fees</option>
                        <option value="Fellowship Drinks">Fellowship Drinks Tab</option>
                        <option value="Charity / Additional Donations">Charity & Additional Projects</option>
                      </select>
                    </div>

                    {payCategory === 'Fellowship Drinks' && (
                      <div className="form-group animate-fade-in" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--border-radius-md)', marginBottom: '20px' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Beer size={16} style={{ color: 'var(--rotary-gold)' }} />
                          Quantity Consumed (₹200 / drink)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px' }}
                            onClick={() => setPayQuantity(prev => Math.max(1, prev - 1))}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '18px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>
                            {payQuantity}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px' }}
                            onClick={() => setPayQuantity(prev => prev + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Amount Collected (₹) *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Amount in Rupees"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        disabled={payCategory === 'Fellowship Drinks' || payCategory === 'Membership Fee'}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Receipt / Drink Details Notes *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Paid via UPI, 3 beers consumed, or Project Smile donation"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                      disabled={recordingPayment}
                    >
                      Record Payment
                    </button>
                  </form>
                )}

                {/* 3. ACTION ITEMS PANEL */}
                {activeSubTab === 'tasks' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--rotary-blue-dark)' }}>
                        Global Action Items
                      </h3>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setConvertActionDetails('');
                          setConvertActionAssignee('');
                          setConvertingOpinion({ isNew: true, "Opinion Text": "Creating a New Action Item from scratch" });
                        }}
                      >
                        New Action Item
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Note: All active action items (and the 5 most recently completed ones) across all meetings are listed in the Active Action Checklist below. Use this button to create a new action item that isn't tied to a specific discussion point.
                    </p>
                  </div>
                )}

                {/* 4. PROJECTS PANEL */}
                {activeSubTab === 'projects' && (
                  <form onSubmit={handleSaveProjectNote} className="animate-fade-in">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--rotary-blue-dark)' }}>
                      Log Service Project Notes
                    </h3>

                    {projectError && (
                      <div className="login-error" style={{ marginBottom: '16px' }}>
                        <span>{projectError}</span>
                      </div>
                    )}

                    {projectSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Project notes logged successfully!</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Select Project *</label>
                      <select
                        className="form-control"
                        value={projEventId}
                        onChange={(e) => setProjEventId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Project --</option>
                        {serviceProjects.map(p => (
                          <option key={p["Event ID"]} value={p["Event ID"]}>{p["Event Name"]}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Project Notes & Updates *</label>
                      <textarea
                        className="form-control"
                        style={{ height: '100px', resize: 'none' }}
                        placeholder="Detail project tasks done, budgets, or meeting notes..."
                        value={projNotesText}
                        onChange={(e) => setProjNotesText(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Project Status</label>
                      <select
                        className="form-control"
                        value={projStatus}
                        onChange={(e) => setProjStatus(e.target.value)}
                      >
                        <option value="Upcoming">Upcoming (Planned / In Progress)</option>
                        <option value="Completed">Completed (Successfully executed)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                      disabled={savingProjectNote}
                    >
                      Save Project Notes
                    </button>
                  </form>
                )}

                {/* 5. OPINIONS PANEL */}
                {activeSubTab === 'opinions' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--rotary-blue-dark)', margin: 0 }}>
                        Discussions & Member Opinions
                      </h3>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setOpinionSuccess(false);
                          setOpinionError('');
                          setShowOpinionModal(true);
                        }}
                      >
                        + Raise a Point
                      </button>
                    </div>

                    {opinionSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Member opinion successfully logged!</span>
                      </div>
                    )}

                    {meetingOpinions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {meetingOpinions.map(o => (
                          <div key={o["Opinion ID"]} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>👤 {o["Member Name"]}</span>
                              {o["Action Required"] === 'Yes' && (
                                <span style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                                  {o["Action Assignee"] ? `ACTION REQUIRED: ${(members.find(m => m["Member ID"] === o["Action Assignee"])?.["Name"] || o["Action Assignee"]).toUpperCase()}` : 'ACTION REQUIRED'}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '4px 0' }}>
                              "{o["Opinion Text"]}"
                            </p>
                            {o["Action Required"] === 'Yes' && o["Action Details"] && (
                              <div style={{ fontSize: '12px', color: 'var(--error)', marginTop: '8px', borderLeft: '2px solid var(--error)', paddingLeft: '8px' }}>
                                {o["Action Details"]}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                              <button 
                                onClick={() => handleVoteOpinion(o["Opinion ID"])}
                                style={{ 
                                  background: 'transparent', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '20px', 
                                  padding: '4px 10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  color: (o.votes || []).includes(currentUser?.["Member ID"]) ? 'var(--primary)' : 'var(--text-secondary)',
                                  borderColor: (o.votes || []).includes(currentUser?.["Member ID"]) ? 'var(--primary)' : 'var(--border-color)'
                                }}
                              >
                                <ThumbsUp size={14} /> 
                                {(o.votes || []).length > 0 ? (o.votes || []).length : 'Vote'}
                              </button>
                              
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {o.deletionRequestedBy ? (
                                  o.deletionRequestedBy === currentUser?.["Member ID"] ? (
                                    <span style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>Deletion Pending Approval</span>
                                  ) : (isPresident || isSecretary || isTreasurer) && (
                                    <>
                                      <button onClick={() => handleApproveDelete(o["Opinion ID"])} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--error)', borderColor: 'var(--error)' }}>Approve Delete</button>
                                      <button onClick={() => handleRejectDelete(o["Opinion ID"])} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Reject Delete</button>
                                    </>
                                  )
                                ) : o.editRequestedBy ? (
                                  o.editRequestedBy === currentUser?.["Member ID"] ? (
                                    <span style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>Edit Pending Approval</span>
                                  ) : (isPresident || isSecretary || isTreasurer) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#fffbeb', padding: '8px', borderRadius: '4px', border: '1px solid #fde68a', fontSize: '11px' }}>
                                      <div style={{ fontWeight: 600 }}>Proposed Edit by {o.editRequestedByName}:</div>
                                      <div>"{o.proposedText}"</div>
                                      {o.proposedDetails && <div style={{ color: 'var(--error)' }}>{o.proposedDetails}</div>}
                                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <button onClick={() => handleApproveEdit(o["Opinion ID"])} className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '10px' }}>Approve Edit</button>
                                        <button onClick={() => handleRejectEdit(o["Opinion ID"])} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '10px' }}>Reject Edit</button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <>
                                    {(o["Action Required"] !== 'Yes' || !o["Action Status"] || o["Action Status"] === 'Pending') && (isPresident || isSecretary || isTreasurer) && (
                                      <button 
                                        className="btn btn-secondary"
                                        style={{ fontSize: '11px', padding: '4px 10px' }}
                                        onClick={() => setConvertingOpinion(o)}
                                      >
                                        Convert to Action Item
                                      </button>
                                    )}
                                    {(isPresident || isSecretary || isTreasurer) && (
                                      <>
                                        <button onClick={() => {
                                          setEditingOpinion(o);
                                          setEditProposedText(o["Opinion Text"] || '');
                                          setEditProposedDetails(o["Action Details"] || '');
                                        }} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>✏️ Edit</button>
                                        <button onClick={() => handleRequestDelete(o["Opinion ID"])} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--error)', borderColor: 'var(--error)' }}>🗑️ Delete</button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No discussion points logged for this meeting.</p>
                    )}

                              </div>
                )}

              </div>
            </div>

            {/* Right Column: Active Feed of inputs */}
            <div className="dashboard-col" style={{ gap: '20px' }}>
              
              {/* 1. Active Task Checklist (Review during meeting) */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={16} style={{ color: 'var(--success)' }} />
                    Active Action Checklist
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {meetingTasks.filter(t => t["Status"] === "Completed").length} / {meetingTasks.length} Done
                  </span>
                </div>
                
                {meetingTasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {meetingTasks.map(t => (
                      <div 
                        key={t["Task ID"]}
                        style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                            {t["Title"]}
                            {t.Status === 'Completed' && (
                              <span style={{ fontSize: '10px', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '10px' }}>
                                Completed
                              </span>
                            )}
                            {(!t.Status || t.Status === 'Pending') && (
                              <span style={{ fontSize: '10px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '10px' }}>
                                Pending
                              </span>
                            )}
                            {t.Status === 'Awaiting PST Approval' && (
                              <span style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '10px' }}>
                                Awaiting Approval
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Assigned to: {t["Assigned Member Name"] || t["Assigned Member ID"]} 
                            {t.originalMeetingDate && (
                              <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                From: {t.originalMeetingDate}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            📅 {t["Target Date"]}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {t.isOpinionAction ? (
                              <>
                                {(!t["Status"] || t["Status"] === 'Pending') && t.isAssignee && (
                                  <button onClick={() => handleToggleOpinionActionStatus(t.originalOpinion, t["Status"] || 'Pending', t.isAssignee)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
                                    Mark Complete
                                  </button>
                                )}
                                {(!t["Status"] || t["Status"] === 'Pending') && (isPresident || isSecretary || isTreasurer) && (
                                  <button onClick={() => setConvertingOpinion(t.originalOpinion)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                    Reassign
                                  </button>
                                )}
                                {t["Status"] === 'Awaiting PST Approval' && (isPresident || isSecretary || isTreasurer) && (
                                  <>
                                    <button onClick={() => handleToggleOpinionActionStatus(t.originalOpinion, t["Status"], t.isAssignee)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
                                      Approve
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleRejectOpinionAction(t.originalOpinion, e); }} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--error)', borderColor: 'var(--error)' }}>
                                      Reject
                                    </button>
                                    <button onClick={() => setConvertingOpinion(t.originalOpinion)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                      Reassign
                                    </button>
                                  </>
                                )}
                                
                                {t.originalOpinion.deletionRequestedBy ? (
                                  t.originalOpinion.deletionRequestedBy === currentUser?.["Member ID"] ? (
                                    <span style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>Deletion Pending</span>
                                  ) : (isPresident || isSecretary || isTreasurer) && (
                                    <>
                                      <button onClick={() => handleApproveDelete(t.originalOpinion["Opinion ID"])} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--error)', borderColor: 'var(--error)' }}>Approve Delete</button>
                                      <button onClick={() => handleRejectDelete(t.originalOpinion["Opinion ID"])} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Reject Delete</button>
                                    </>
                                  )
                                ) : t.originalOpinion.editRequestedBy ? (
                                  t.originalOpinion.editRequestedBy === currentUser?.["Member ID"] ? (
                                    <span style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>Edit Pending</span>
                                  ) : (isPresident || isSecretary || isTreasurer) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#fffbeb', padding: '8px', borderRadius: '4px', border: '1px solid #fde68a', fontSize: '11px', marginTop: '4px', width: '100%' }}>
                                      <div style={{ fontWeight: 600 }}>Proposed Edit by {t.originalOpinion.editRequestedByName}:</div>
                                      <div>"{t.originalOpinion.proposedText}"</div>
                                      {t.originalOpinion.proposedDetails && <div style={{ color: 'var(--error)' }}>{t.originalOpinion.proposedDetails}</div>}
                                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <button onClick={() => handleApproveEdit(t.originalOpinion["Opinion ID"])} className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '10px' }}>Approve Edit</button>
                                        <button onClick={() => handleRejectEdit(t.originalOpinion["Opinion ID"])} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '10px' }}>Reject Edit</button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  (isPresident || isSecretary || isTreasurer) && (
                                    <>
                                      <button onClick={() => {
                                        setEditingOpinion(t.originalOpinion);
                                        setEditProposedText(t.originalOpinion["Opinion Text"] || '');
                                        setEditProposedDetails(t.originalOpinion["Action Details"] || '');
                                      }} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>✏️ Edit</button>
                                      <button onClick={() => handleRequestDelete(t.originalOpinion["Opinion ID"])} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--error)', borderColor: 'var(--error)' }}>🗑️ Delete</button>
                                    </>
                                  )
                                )}
                              </>
                            ) : (
                              <>
                                {t["Status"] !== 'Completed' && (
                                  <button onClick={() => handleToggleTaskStatus(t["Task ID"], t["Status"])} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--success)' }}>
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
                    No action items created for this meeting.
                  </p>
                )}
              </div>

              {/* 2. Categorized ledger view for this meeting */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title">
                  <DollarSign size={16} style={{ color: 'var(--rotary-blue-light)' }} />
                  Recorded Payments Ledger
                </div>
                {meetingPayments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {meetingPayments.map(p => (
                      <div 
                        key={p["Payment ID"]}
                        style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', fontSize: '12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{p["Member Name"]}</span>
                          <span style={{ color: 'var(--rotary-blue-dark)' }}>₹{p["Amount"]}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Category: {p["Category"]} {p["Quantity"] > 0 && `(x${p["Quantity"]})`}</span>
                        </div>
                        {p["Notes"] && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '6px' }}>
                            "{p["Notes"]}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                    No payments logged during this meeting.
                  </p>
                )}
              </div>

            </div>

          </div>
        )}
{/* Action Item Conversion Modal */}
                    <Modal
                      isOpen={!!convertingOpinion}
                      onClose={() => setConvertingOpinion(null)}
                      title="Convert to Action Item"
                      footer={
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                            onClick={() => setConvertingOpinion(null)}
                            disabled={convertingLoading}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            form="convert-action-form"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                            disabled={convertingLoading}
                          >
                            {convertingLoading ? 'Saving...' : 'Save Action Item'}
                          </button>
                        </div>
                      }
                    >
                      <div style={{ padding: '0 20px 20px 20px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          Converting the following discussion point into an assigned Action Item:
                        </p>
                        
                        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                          "{convertingOpinion?.["Opinion Text"]}"
                        </div>

                        {convertError && (
                          <div className="login-error" style={{ marginBottom: '16px' }}>
                            <span>{convertError}</span>
                          </div>
                        )}

                        <form id="convert-action-form" onSubmit={handleConvertActionItem}>
                          <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Action Item Details *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Action: Secretary to contact District Chairperson by Friday"
                              value={convertActionDetails}
                              onChange={(e) => setConvertActionDetails(e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Assign Action To *</label>
                            <select
                              className="form-control"
                              value={convertActionAssignee}
                              onChange={(e) => setConvertActionAssignee(e.target.value)}
                              required
                            >
                              <option value="">Select Assignee</option>
                              {members.map(m => (
                                <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]} ({m["Role"] || "Member"})</option>
                              ))}
                            </select>
                          </div>
                        </form>
                      </div>
                    </Modal>

                    <Modal
                      isOpen={!!editingOpinion}
                      onClose={() => setEditingOpinion(null)}
                      title="Propose Edit"
                      footer={
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '10px' }}
                            onClick={() => setEditingOpinion(null)}
                            disabled={editModLoading}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            form="edit-opinion-form"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '10px' }}
                            disabled={editModLoading}
                          >
                            {editModLoading ? 'Submitting...' : 'Submit Proposed Edit'}
                          </button>
                        </div>
                      }
                    >
                      <div style={{ padding: '4px' }}>
                        {editModError && (
                          <div className="login-error" style={{ marginBottom: '16px' }}>
                            <AlertCircle size={18} />
                            <span>{editModError}</span>
                          </div>
                        )}
                        <form id="edit-opinion-form" onSubmit={handleRequestEditSubmit}>
                          <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Proposed Discussion Text / Title *</label>
                            <textarea
                              className="form-control"
                              rows="3"
                              value={editProposedText}
                              onChange={(e) => setEditProposedText(e.target.value)}
                              required
                            />
                          </div>
                          
                          {editingOpinion && editingOpinion["Action Required"] === 'Yes' && (
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Proposed Action Details *</label>
                              <textarea
                                className="form-control"
                                rows="3"
                                value={editProposedDetails}
                                onChange={(e) => setEditProposedDetails(e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </form>
                      </div>
                    </Modal>

                    <Modal
                      isOpen={showOpinionModal}
                      onClose={() => setShowOpinionModal(false)}
                      title="Raise a Point / Opinion"
                      footer={
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '10px' }}
                            onClick={() => setShowOpinionModal(false)}
                            disabled={savingOpinion}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            form="meeting-opinion-form"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '10px' }}
                            disabled={savingOpinion}
                          >
                            {savingOpinion ? 'Saving...' : 'Record Point'}
                          </button>
                        </div>
                      }
                    >
                      {opinionError && (
                        <div className="login-error" style={{ marginBottom: '16px' }}>
                          <span>{opinionError}</span>
                        </div>
                      )}

                      <form id="meeting-opinion-form" onSubmit={handleSaveOpinion} style={{ textAlign: 'left' }}>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Raised By Member *</label>
                          <select
                            className="form-control"
                            value={opinionMemberId}
                            onChange={(e) => setOpinionMemberId(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Member --</option>
                            {members.map(m => (
                              <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Points / Opinion Raised *</label>
                          <textarea
                            className="form-control"
                            rows={4}
                            placeholder="Detail the discussion points raised..."
                            value={opinionText}
                            onChange={(e) => setOpinionText(e.target.value)}
                            required
                            style={{ resize: 'vertical' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Does this require an Action Item? *</label>
                          <select
                            className="form-control"
                            value={opinionActionRequired}
                            onChange={(e) => setOpinionActionRequired(e.target.value)}
                          >
                            <option value="No">No (Info / Discussion only)</option>
                            <option value="Yes">Yes (Needs follow-up action)</option>
                          </select>
                        </div>

                        {opinionActionRequired === 'Yes' && (
                          <div className="form-group animate-fade-in" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Action Item Details *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Action: Secretary to contact District Chairperson by Friday"
                              value={opinionActionDetails}
                              onChange={(e) => setOpinionActionDetails(e.target.value)}
                              required
                            />
                            
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', marginTop: '16px' }}>Assign Action To *</label>
                            <select
                              className="form-control"
                              value={opinionActionAssignee}
                              onChange={(e) => setOpinionActionAssignee(e.target.value)}
                              required
                            >
                              <option value="">Select Assignee</option>
                              {members.map(m => (
                                <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]} ({m["Role"] || "Member"})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </form>
                    </Modal>
        
      </div>
    </div>
  );
};
