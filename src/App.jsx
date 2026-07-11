import React, { useState, useEffect, useRef } from 'react';
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
import { Gallery } from './pages/Gallery';
import { WhatsNew } from './pages/WhatsNew';
import { MeetingConsole } from './pages/MeetingConsole';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { InductLanding } from './pages/InductLanding';
import { Feedbacks } from './pages/Feedbacks';
import { ClubDetails } from "./pages/ClubDetails";
import { Inaugurate } from './pages/Inaugurate';
import { BusinessDirectory } from './pages/BusinessDirectory';
import { Marketplace } from './pages/Marketplace';
import { Subscription } from './pages/Subscription';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { AwardsManagement } from './pages/AwardsManagement';
import { FeedbackWidget } from './components/FeedbackWidget';
import { Calendar, MapPin, Clock, X, Check, CheckSquare } from 'lucide-react';
import './index.css';
import logoImg from './assets/rotary-logo.png';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', margin: '20px' }}>
          <h2>Something went wrong.</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children; 
  }
}


const SplashScreen = ({ status }) => (
  <div className="splash-container">
    <div className="splash-content">
      <img 
        src={logoImg} 
        alt="Rotary Logo" 
        className="splash-logo"
      />
      <h1 className="splash-title">
        <span className="splash-title-white">Rotary</span>
        <span className="splash-title-gold">Pulse</span>
      </h1>
      <div className="splash-subtitle">
        The heartbeat of your Rotary Club
      </div>
      <div className="splash-loader-bar">
        <div className="splash-loader-progress"></div>
      </div>
      <p className="splash-status">{status}</p>
    </div>
    <img 
      src={logoImg} 
      alt="Rotary Watermark" 
      className="splash-watermark" 
    />
  </div>
);


function AppContent() {
  const isInaugurate = new URLSearchParams(window.location.search).get('page') === 'inaugurate';
  if (isInaugurate) {
    return <Inaugurate />;
  }
  
  if (window.location.pathname === '/privacy-policy') {
    return <PrivacyPolicy />;
  }

  const { currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || params.get('tab');
    const stored = sessionStorage.getItem('rc_active_tab');
    const validTabs = ['dashboard', 'members', 'events', 'attendance', 'payments', 'announcements', 'profile', 'gallery', 'meeting-console', 'feedbacks', 'whatsnew', 'directory', 'marketplace', 'subscription'];
    if (page && validTabs.includes(page)) return page;
    if (stored && validTabs.includes(stored)) return stored;
    return 'dashboard';
  });

  useEffect(() => {
    sessionStorage.setItem('rc_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;
    
    // Listen for foreground push notifications
    import('./services/firebase').then(({ messaging }) => {
      if (messaging && isMounted) {
        import('firebase/messaging').then(({ onMessage }) => {
          if (isMounted) {
            unsubscribe = onMessage(messaging, (payload) => {
              console.log('Foreground push received:', payload);
              if ((payload.notification || payload.data) && Notification.permission === 'granted') {
                const title = payload.notification?.title || payload.data?.title || "New Notification";
                const body = payload.notification?.body || payload.data?.body || "";
                
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                      body: body,
                      icon: '/rotary-logo.png',
                      data: { url: payload.data?.url }
                    });
                  });
                } else {
                  const notification = new Notification(title, {
                    body: body,
                    icon: '/rotary-logo.png'
                  });
                  notification.onclick = () => {
                    notification.close();
                    const url = payload.data?.url;
                    if (url) {
                      const urlParams = new URLSearchParams(url.split('?')[1]);
                      const page = urlParams.get('page');
                      if (page) setActiveTab(page);
                    }
                  };
                }
              }
            });
          }
        });
      }
    }).catch(err => console.error("Error setting up foreground messaging:", err));

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const [data, setData] = useState({
    members: [],
    events: [],
    attendance: [],
    payments: [],
    announcements: [],
    tasks: [],
    projectNotes: [],
    minutes: [],
    opinions: []
  });
  const [loading, setLoading] = useState(true);
  const [globalViewMemberId, setGlobalViewMemberId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleViewMember = (e) => {
      setGlobalViewMemberId(e.detail);
      setActiveTab('members');
    };
    window.addEventListener('viewMember', handleViewMember);
    return () => window.removeEventListener('viewMember', handleViewMember);
  }, []);

  // Enforce landing screen staying minimum 5 seconds
  const [splashTimeoutFinished, setSplashTimeoutFinished] = useState(() => {
    return new URLSearchParams(window.location.search).get('inaugurated') === 'true';
  });

  // Self check-in state
  const [checkinEventId, setCheckinEventId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Enforce minimum 5 seconds splash display
  useEffect(() => {
    if (splashTimeoutFinished) return;
    const timer = setTimeout(() => {
      setSplashTimeoutFinished(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await api.fetchAllData();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to retrieve records');
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Intercept QR code search params on mount
  const [inductChapterId, setInductChapterId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const eventId = params.get('eventId');
    const inductParam = params.get('induct');
    
    if (action === 'checkin' && eventId) {
      setCheckinEventId(eventId);
    }
    if (inductParam) {
      setInductChapterId(inductParam);
    }
  }, []);

  // Fetch database rows on mount or auth change
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // Silently re-fetch when the user switches back to this tab (handles cross-session updates in mock mode)
  useEffect(() => {
    if (!currentUser) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser]);

  // Immediately sync when another tab writes to localStorage (same-origin cross-session updates)
  useEffect(() => {
    if (!currentUser) return;
    const handleStorageEvent = (e) => {
      if (e.key === 'rc_payments' || e.key === 'rc_announcements' || e.key === 'rc_members' || e.key === 'rc_payment_edits') {
        refreshData(true);
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
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
        setTimeout(() => {
          setCheckinEventId(null);
          // Redirect to meeting/dashboard screen and clear checkin params
          window.location.replace(window.location.origin + window.location.pathname + '?page=dashboard');
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

  // Show splash landing screen for minimum 5 seconds OR while auth session is loading
  if (authLoading || !splashTimeoutFinished) {
    return <SplashScreen status={authLoading ? "Authorizing session..." : "Loading Rotary Pulse..."} />;
  }

  // Handle Induction link
  if (inductChapterId) {
    return <InductLanding inductChapterId={inductChapterId} onBack={() => {
      window.history.replaceState({}, document.title, window.location.pathname);
      setInductChapterId(null);
    }} />;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  // Render current view
  const renderTabContent = () => {
    if (currentUser?.isSuperAdmin) {
      if (activeTab === 'dashboard') return <SuperAdminDashboard data={data} loading={loading} refreshData={refreshData} />;
      if (activeTab === 'profile') return <Profile />;
      if (activeTab === 'gallery') return <Gallery />;
      if (activeTab === 'feedbacks') return <Feedbacks data={data} loading={loading} refreshData={refreshData} />;
      if (activeTab === 'whatsnew') return <WhatsNew setActiveTab={setActiveTab} />;
      // Super Admin uses dashboard by default for other tabs, or we can add more admin tabs here later
      return <SuperAdminDashboard data={data} loading={loading} refreshData={refreshData} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} loading={loading} setActiveTab={setActiveTab} refreshData={refreshData} />;
      case 'directory':
        if (currentUser.subscriptionStatus !== 'Active') return <Subscription />;
        return <BusinessDirectory data={data} />;
      case 'marketplace':
        if (currentUser.subscriptionStatus !== 'Active') return <Subscription />;
        return <Marketplace data={data} />;
      case 'subscription':
        return <Subscription />;
      case 'members':
        if (currentUser.subscriptionStatus !== 'Active') return <Subscription />;
        return <Members data={data} loading={loading} refreshData={refreshData} viewMemberId={globalViewMemberId} clearViewMemberId={() => setGlobalViewMemberId(null)} />;
      case 'events':
        return <Events data={data} loading={loading} refreshData={refreshData} />;
      case 'attendance':
        return <Attendance data={data} loading={loading} refreshData={refreshData} />;
      case 'payments':
        return <Payments data={data} loading={loading} refreshData={refreshData} />;
      case 'announcements':
        return <Announcements data={data} loading={loading} refreshData={refreshData} />;
      case 'profile':
        return <Profile data={data} refreshData={refreshData} />;
      case 'gallery':
        return <Gallery />;
      case 'feedbacks':
        return <Feedbacks data={data} loading={loading} refreshData={refreshData} />;
      case 'club_details':
        return <ClubDetails />;
      case 'awards':
        return <AwardsManagement />;
      case 'meeting-console':
        return <MeetingConsole data={data} loading={loading} refreshData={refreshData} setActiveTab={setActiveTab} />;
      case 'whatsnew':
        return <WhatsNew setActiveTab={setActiveTab} />;
      default:
        return <Dashboard data={data} loading={loading} setActiveTab={setActiveTab} refreshData={refreshData} />;
    }
  };

  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
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
      <FeedbackWidget currentUser={currentUser} />
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AppContent />
    </GlobalErrorBoundary>
  );
}
