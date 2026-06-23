import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { seedFirebaseDatabase } from '../services/firebaseSeeder';
import { User, Phone, Mail, Award, Calendar, Link, Settings, Database, LogOut, Activity } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import './pages.css';

export const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (currentUser) {
      api.getMyActivities(currentUser.chapterId, currentUser["Member ID"]).then(setActivities);
    }
  }, [currentUser]);

  const handleSeedDatabase = async () => {
    if (!window.confirm("Are you sure you want to seed the Firestore database with initial mock data? This will overwrite or add initial documents.")) {
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedFirebaseDatabase();
      if (res.success) {
        setSeedResult({ success: true, message: "Database seeded successfully!" });
      } else {
        setSeedResult({ success: false, message: res.error || "Failed to seed database" });
      }
    } catch (err) {
      setSeedResult({ success: false, message: err.toString() });
    } finally {
      setSeeding(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>My Profile</h1>
          <p className="page-subtitle">View your membership details and system configurations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px' }}>
          <Avatar member={currentUser} size={100} style={{ border: '3px solid var(--rotary-gold)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', marginTop: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{currentUser["Name"]}</h2>
          <div className="member-role-badge" style={{ fontSize: '12px', padding: '4px 12px', marginTop: '6px' }}>
            {currentUser["Role"]}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '14px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} />
              <span>{currentUser["Mobile"]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} />
              <span style={{ wordBreak: 'break-all' }}>{currentUser["Email"]}</span>
            </div>
          </div>
        </div>

        {/* Detailed Fields Card */}
        <div className="card">
          <div className="card-title">
            <Award size={18} style={{ color: 'var(--rotary-blue)' }} />
            Rotary Member Information
          </div>
          <div className="member-detail-fields" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div className="detail-field-row">
              <span className="detail-field-label">Rotary ID</span>
              <span className="detail-field-value">{currentUser["Member ID"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Classification</span>
              <span className="detail-field-value">{currentUser["Classification"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Blood Group</span>
              <span className="detail-field-value" style={{ color: 'var(--error)', fontWeight: 600 }}>{currentUser["Blood Group"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Birthday</span>
              <span className="detail-field-value">🎂 {currentUser["Birthday"]}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Wedding Anniversary</span>
              <span className="detail-field-value">💍 {currentUser["Anniversary"] || "Single / Not Specified"}</span>
            </div>
            <div className="detail-field-row">
              <span className="detail-field-label">Join Date</span>
              <span className="detail-field-value">📅 {currentUser["Join Date"]}</span>
            </div>
          </div>
        </div>

        {/* My Activities Card */}
        <div className="card">
          <div className="card-title">
            <Activity size={18} style={{ color: 'var(--rotary-gold)' }} />
            My Activities
          </div>
          <div style={{ padding: '16px' }}>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activities.map(act => (
                  <div key={act.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{act.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{act.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{new Date(act.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No activities recorded yet.</p>
            )}
          </div>
        </div>

        <button 
          onClick={logout} 
          className="btn btn-secondary"
          style={{ width: '100%', padding: '14px', color: 'var(--error)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={16} />
          Sign Out of Account
        </button>

      </div>
    </div>
  );
};
