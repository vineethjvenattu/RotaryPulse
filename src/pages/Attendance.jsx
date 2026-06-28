import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar } from '../components/Avatar';
import { Check, X, Users, Search, AlertCircle, Save, QrCode } from 'lucide-react';
import './pages.css';

export const Attendance = ({ data, loading, refreshData }) => {
  const { canMarkAttendance } = useAuth();
  
  const { members = [], events = [], attendance = [] } = data;
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localStatuses, setLocalStatuses] = useState({}); // { memberId: 'Present' | 'Absent' }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Initialize selected event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      // Find event matching exactly today's date, or fallback to the closest upcoming
      const todayStr = new Date().toISOString().split('T')[0];
      const todayEvent = events.find(e => e["Date"] === todayStr);
      const closest = todayEvent || events.find(e => e["Date"] >= todayStr) || events[0];
      setSelectedEventId(closest["Event ID"]);
    }
  }, [events, selectedEventId]);

  // Load existing attendance for selected event
  useEffect(() => {
    if (selectedEventId) {
      const eventAttendance = attendance.filter(a => a["Event ID"] === selectedEventId);
      const statuses = {};
      
      // Seed with existing attendance
      eventAttendance.forEach(a => {
        statuses[a["Member ID"]] = a["Status"];
      });
      
      // Default rest of members to 'Absent' (or unmarked)
      members.forEach(m => {
        if (!statuses[m["Member ID"]]) {
          statuses[m["Member ID"]] = 'Absent';
        }
      });
      
      setLocalStatuses(statuses);
      setSuccess(false);
      setError('');
    }
  }, [selectedEventId, attendance, members]);

  if (!canMarkAttendance) {
    return (
      <div className="content-area animate-fade-in">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={36} style={{ color: 'var(--error)', marginBottom: '12px' }} />
          <h3>Access Denied</h3>
          <p>Only the President and Secretary are authorized to manage meeting attendance.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Attendance...</div>;
  }

  const selectedEvent = events.find(e => e["Event ID"] === selectedEventId);

  // Statistics
  const totalMembersCount = members.length;
  const presentCount = Object.values(localStatuses).filter(s => s === 'Present').length;
  const absentCount = Object.values(localStatuses).filter(s => s === 'Absent').length;

  const handleStatusToggle = (memberId, status) => {
    setLocalStatuses(prev => ({
      ...prev,
      [memberId]: status
    }));
    setSuccess(false);
  };

  const handleSaveAttendance = async () => {
    if (!selectedEventId || !selectedEvent) {
      setError('No event selected');
      return;
    }

    setError('');
    setSuccess(false);
    setSaving(true);

    const attendanceList = members.map(m => ({
      memberId: m["Member ID"],
      memberName: m["Name"],
      status: localStatuses[m["Member ID"]] || 'Absent'
    }));

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const result = await api.markAttendance(
        selectedEventId,
        selectedEvent["Event Name"],
        attendanceList,
        todayStr
      );

      if (result.success) {
        setSuccess(true);
        await refreshData();
      } else {
        setError(result.error || 'Failed to save attendance records');
      }
    } catch (err) {
      setError('Error saving attendance records');
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m["Name"].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Mark Attendance</h1>
          <p className="page-subtitle">Track member participation in club events</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Event Selector Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '16px', margin: 0 }}>Select Event</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={refreshData}
                title="Refresh Attendance Data"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21v-5h5" />
                </svg>
                Refresh
              </button>
              {selectedEventId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => setShowQrModal(true)}
                >
                  <QrCode size={18} />
                  QR Code
                </button>
              )}
            </div>
          </div>
          
          <select
            className="form-control"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          >
            <option value="">-- Choose Event --</option>
            {events.map((e) => (
              <option key={e["Event ID"]} value={e["Event ID"]}>
                {e["Event Name"] || e["Title"]} ({e["Date"]})
              </option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <>
            {/* Stat Banner */}
            <div className="attendance-summary">
              <div className="attendance-summary-box" style={{ borderLeft: '4px solid var(--success)' }}>
                <div className="attendance-summary-count" style={{ color: 'var(--success)' }}>{presentCount}</div>
                <div className="attendance-summary-label">Present</div>
              </div>
              <div className="attendance-summary-box" style={{ borderLeft: '4px solid var(--error)' }}>
                <div className="attendance-summary-count" style={{ color: 'var(--error)' }}>{absentCount}</div>
                <div className="attendance-summary-label">Absent</div>
              </div>
              <div className="attendance-summary-box" style={{ borderLeft: '4px solid var(--rotary-blue)' }}>
                <div className="attendance-summary-count" style={{ color: 'var(--rotary-blue-dark)' }}>{totalMembersCount}</div>
                <div className="attendance-summary-label">Total strength</div>
              </div>
            </div>

            {/* Checklist Box */}
            <div className="card">
              <div className="search-input-wrapper" style={{ marginBottom: '20px' }}>
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Quick search member name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {error && (
                <div className="login-error" style={{ marginBottom: '16px' }}>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="login-error" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '16px' }}>
                  <Check size={18} />
                  <span>Attendance records saved successfully!</span>
                </div>
              )}

              <div className="attendance-members-list">
                {filteredMembers.map(m => {
                  const status = localStatuses[m["Member ID"]] || 'Absent';
                  return (
                    <div key={m["Member ID"]} className="attendance-member-row">
                      <div className="attendance-member-info">
                        <Avatar member={m} size={48} className="attendance-avatar" />
                        <div>
                          <div className="attendance-name">{m["Name"]}</div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {m["Member ID"]}</span>
                        </div>
                      </div>

                      <div className="attendance-status-toggles">
                        <button
                          type="button"
                          className={`attendance-status-btn ${status === 'Present' ? 'present' : ''}`}
                          onClick={() => handleStatusToggle(m["Member ID"], 'Present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`attendance-status-btn ${status === 'Absent' ? 'absent' : ''}`}
                          onClick={() => handleStatusToggle(m["Member ID"], 'Absent')}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '24px' }}
                onClick={handleSaveAttendance}
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving Records...' : 'Save & Submit Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
      {showQrModal && selectedEvent && createPortal(
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '360px' }}>
            <button className="drawer-close" onClick={() => setShowQrModal(false)}>
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Event Check-in QR</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedEvent["Event Name"]}</p>
            
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                window.location.origin + window.location.pathname + `?action=checkin&eventId=${selectedEventId}`
              )}`}
              alt="Check-in QR Code"
              style={{ display: 'block', margin: '24px auto', border: '8px solid white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', width: '220px', height: '220px' }}
            />
            
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Ask members to scan this QR code with their phones to check-in instantly.
            </p>
            
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => setShowQrModal(false)}
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
