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
  AlertCircle
} from 'lucide-react';
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
  const [savingOpinion, setSavingOpinion] = useState(false);
  const [opinionSuccess, setOpinionSuccess] = useState(false);
  const [opinionError, setOpinionError] = useState('');

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
      const minutesRecord = data.minutes.find(m => m["Event ID"] === selectedEventId);
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
  const meetingTasks = tasks.filter(t => t["Event ID"] === selectedEventId);
  const meetingOpinions = opinions.filter(o => o["Event ID"] === selectedEventId);
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
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await refreshData();
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
  const handleSaveOpinion = async (e) => {
    e.preventDefault();
    if (!opinionMemberId || !opinionText.trim()) {
      setOpinionError('Please select a member and enter their points/opinions');
      return;
    }

    if (opinionActionRequired === 'Yes' && !opinionActionDetails.trim()) {
      setOpinionError('Please describe the action item required');
      return;
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
        opinionActionRequired === 'Yes' ? opinionActionDetails : ''
      );

      if (result.success) {
        setOpinionSuccess(true);
        setOpinionMemberId('');
        setOpinionText('');
        setOpinionActionRequired('No');
        setOpinionActionDetails('');
        await refreshData();
      } else {
        setOpinionError(result.error || 'Failed to record opinion');
      }
    } catch (err) {
      setOpinionError('Connection error during recording');
    } finally {
      setSavingOpinion(false);
    }
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
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
                  <form onSubmit={handleAddTask} className="animate-fade-in">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--rotary-blue-dark)' }}>
                      Assign Action Item
                    </h3>

                    {taskError && (
                      <div className="login-error" style={{ marginBottom: '16px' }}>
                        <span>{taskError}</span>
                      </div>
                    )}

                    {taskSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Action Item successfully assigned!</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Task Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Book Venue for Charity Event"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        style={{ height: '80px', resize: 'none' }}
                        placeholder="Provide details about task goals..."
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Assign To *</label>
                        <select
                          className="form-control"
                          value={taskAssigneeId}
                          onChange={(e) => setTaskAssigneeId(e.target.value)}
                          required
                        >
                          <option value="">-- Choose Member --</option>
                          {members.map(m => (
                            <option key={m["Member ID"]} value={m["Member ID"]}>{m["Name"]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={taskTargetDate}
                          onChange={(e) => setTaskTargetDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                      disabled={addingTask}
                    >
                      Assign Task
                    </button>
                  </form>
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
                  <form onSubmit={handleSaveOpinion} className="animate-fade-in">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--rotary-blue-dark)' }}>
                      Log Discussions & Member Opinions
                    </h3>

                    {opinionError && (
                      <div className="login-error" style={{ marginBottom: '16px' }}>
                        <span>{opinionError}</span>
                      </div>
                    )}

                    {opinionSuccess && (
                      <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                        <Check size={18} />
                        <span>Member opinion successfully logged!</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Raised By Member *</label>
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

                    <div className="form-group">
                      <label className="form-label">Points / Opinion Raised *</label>
                      <textarea
                        className="form-control"
                        style={{ height: '100px', resize: 'none' }}
                        placeholder="Detail the discussion points raised by the member..."
                        value={opinionText}
                        onChange={(e) => setOpinionText(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Does this require an Action Item? *</label>
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
                      <div className="form-group animate-fade-in">
                        <label className="form-label">Action Item Details *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Action: Secretary to contact District Chairperson by Friday"
                          value={opinionActionDetails}
                          onChange={(e) => setOpinionActionDetails(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                      disabled={savingOpinion}
                    >
                      Record Discussion Point
                    </button>
                  </form>
                )}

              </div>
            </div>

            {/* Right Column: Active Feed of inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. Active Task Checklist (Review during meeting) */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
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
                        style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' }}
                        onClick={() => handleToggleTaskStatus(t["Task ID"], t["Status"])}
                      >
                        <div style={{ marginTop: '2px', color: t["Status"] === 'Completed' ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {t["Status"] === 'Completed' ? <Check size={18} strokeWidth={3} /> : <Clock size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: t["Status"] === 'Completed' ? 'line-through' : 'none', color: t["Status"] === 'Completed' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            {t["Title"]}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            👤 {t["Assigned Member Name"]} • 📅 {t["Target Date"]}
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
      </div>
    </div>
  );
};
