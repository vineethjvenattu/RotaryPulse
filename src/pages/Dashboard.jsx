import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
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
  Heart
} from 'lucide-react';
import './pages.css';

export const Dashboard = ({ data, loading, setActiveTab, refreshData }) => {
  const { currentUser, canMarkAttendance, isPresident, isSecretary, isTreasurer } = useAuth();
  const [projectionTab, setProjectionTab] = useState('finance');

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
  const meetingPayments = payments.filter(p => p["Event ID"] === currentMeetingId);
  const meetingTasks = tasks.filter(t => t["Event ID"] === currentMeetingId);
  const meetingMinutes = data.minutes?.find(m => m["Event ID"] === currentMeetingId);
  const meetingOpinions = opinions.filter(o => o["Event ID"] === currentMeetingId);
  const meetingProjectNotes = projectNotes.filter(pn => pn["Event ID"] === currentMeetingId);

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
    const parts = m["Birthday"].toLowerCase().trim().split(/\s+/);
    if (parts.length < 2) return false;
    const day = parseInt(parts[0], 10);
    const month = parts[1];
    return day === currentDay && month === currentMonthStr;
  });

  const celebratingThisMonth = celebratingToday.length > 0 ? celebratingToday : members.filter(m => {
    if (!m["Birthday"]) return false;
    const parts = m["Birthday"].toLowerCase().trim().split(/\s+/);
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
      <div className="page-header">
        <div className="page-title">
          <h1>Good Morning,</h1>
          <p className="page-subtitle">{currentUser ? currentUser["Name"] : "Rotarian"}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Next Meeting Header Card */}
          {nextEvent ? (
            <div className="card next-meeting-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="meeting-header-tag">
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
              <h3 className="meeting-title">{nextEvent["Event Name"]}</h3>
              
              <div className="meeting-details">
                <div className="meeting-detail-item">
                  <Calendar size={18} />
                  <span>{formatDisplayDate(nextEvent["Date"])}</span>
                </div>
                <div className="meeting-detail-item">
                  <Clock size={18} />
                  <span>{nextEvent["Time"]}</span>
                </div>
                <div className="meeting-detail-item">
                  <MapPin size={18} />
                  <span>{nextEvent["Venue"]}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setActiveTab('events')} 
                  className="btn btn-secondary"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: 'none', color: 'white' }}
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
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rotary-blue-dark)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> Points Raised by Members
                    </h4>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MY TASKS / ACTION ITEMS CHECKLIST CARD */}
          {currentUser && (
            <div className="card" style={{ padding: '20px' }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
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
                    <img 
                      src={member["Image"] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                      alt={member["Name"]} 
                      className="ticker-avatar"
                    />
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
    </div>
  );
};
