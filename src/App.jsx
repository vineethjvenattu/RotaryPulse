import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Events } from './pages/Events';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { Announcements } from './pages/Announcements';
import { Profile } from './pages/Profile';
import { Calendar, MapPin, Clock, X, Check, CheckSquare } from 'lucide-react';
import './index.css';

function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({
    members: [],
    events: [],
    attendance: [],
    payments: [],
    announcements: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Self check-in state
  const [checkinEventId, setCheckinEventId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const refreshData = async () => {
    try {
      setLoading(true);
      const result = await api.fetchAllData();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to retrieve records');
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Intercept QR code search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const eventId = params.get('eventId');
    if (action === 'checkin' && eventId) {
      setCheckinEventId(eventId);
    }
  }, []);

  // Fetch database rows on mount or auth change
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  const handleSelfCheckin = async () => {
    if (!checkinEventId || !currentUser) return;
    
    setConfirming(true);
    setConfirmError('');
    setConfirmSuccess(false);

    const checkinEvent = data.events.find(e => e["Event ID"] === checkinEventId);
    if (!checkinEvent) {
      setConfirmError('Event not found. Contact administrator.');
      setConfirming(false);
      return;
    }

    const checkinRecord = [{
      memberId: currentUser["Member ID"],
      memberName: currentUser["Name"],
      status: 'Present'
    }];

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const result = await api.markAttendance(
        checkinEventId,
        checkinEvent["Event Name"],
        checkinRecord,
        todayStr
      );

      if (result.success) {
        setConfirmSuccess(true);
        setTimeout(async () => {
          setCheckinEventId(null);
          // Remove query parameters from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          await refreshData();
        }, 1800);
      } else {
        setConfirmError(result.error || 'Failed to submit check-in');
      }
    } catch (err) {
      setConfirmError('Connection error during check-in');
    } finally {
      setConfirming(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ fontWeight: 600, color: 'var(--rotary-blue)' }}>Authorizing Member Session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  // Render current view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} loading={loading} setActiveTab={setActiveTab} />;
      case 'members':
        return <Members data={data} loading={loading} />;
      case 'events':
        return <Events data={data} loading={loading} refreshData={refreshData} />;
      case 'attendance':
        return <Attendance data={data} loading={loading} refreshData={refreshData} />;
      case 'payments':
        return <Payments data={data} loading={loading} refreshData={refreshData} />;
      case 'announcements':
        return <Announcements data={data} loading={loading} refreshData={refreshData} />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard data={data} loading={loading} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-main">
        {error && (
          <div className="content-area" style={{ paddingBottom: 0 }}>
            <div className="login-error">
              <span>Error loading database: {error}. Operating in offline/cached mode.</span>
            </div>
          </div>
        )}
        {renderTabContent()}
      </main>

      {/* SELF CHECK-IN CONFIRMATION MODAL */}
      {checkinEventId && currentUser && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="drawer-close" 
              onClick={() => {
                setCheckinEventId(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
            >
              <X size={24} />
            </button>
            
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckSquare size={24} />
            </div>
            
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Confirm Attendance</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Scan detected! Confirm your check-in details below:
            </p>

            {confirmError && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                <span>{confirmError}</span>
              </div>
            )}

            {confirmSuccess ? (
              <div style={{ padding: '16px 0' }} className="animate-fade-in">
                <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Check size={20} />
                  Attendance Confirmed!
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  const evt = data.events.find(e => e["Event ID"] === checkinEventId);
                  if (!evt) return <p style={{ color: 'var(--error)', fontSize: '13px' }}>Loading event details...</p>;
                  return (
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                      <h4 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--rotary-blue-dark)', marginBottom: '8px' }}>{evt["Event Name"]}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>{evt["Date"]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} />
                          <span>{evt["Time"]}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          <span>{evt["Venue"]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setCheckinEventId(null);
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    disabled={confirming}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, backgroundColor: 'var(--success)' }}
                    onClick={handleSelfCheckin}
                    disabled={confirming}
                  >
                    {confirming ? 'Checking in...' : 'Confirm Presence'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppContent />
  );
}
