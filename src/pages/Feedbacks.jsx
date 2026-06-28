import React from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MessageSquare, CheckCircle } from 'lucide-react';
import './pages.css';

export const Feedbacks = ({ data, loading, refreshData }) => {
  const { isPresident, isSecretary, currentUser, globalConfig } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Feedbacks...</div>;
  }

  const feedbacks = data?.feedbacks || [];
  
  const handleAcknowledge = async (feedbackId) => {
    if (!currentUser || !currentUser.chapterId) return;
    try {
      const result = await api.acknowledgeFeedback(currentUser.chapterId, feedbackId);
      if (result.success) {
        refreshData(true);
      } else {
        alert("Failed to acknowledge: " + result.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header desktop-only">
        <div className="page-title">
          <h1>User Feedbacks</h1>
          <p className="page-subtitle">View and manage system feedback and issues reported by members.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <MessageSquare size={24} color="var(--rotary-blue)" />
          <h2 style={{ margin: 0, color: 'var(--rotary-blue)' }}>Reported Feedbacks ({feedbacks.length})</h2>
        </div>
        
        {feedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No feedbacks received yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {feedbacks.map(fb => (
              <div key={fb.id} style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', borderLeft: fb.acknowledged ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>{fb.memberName}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>{(fb.type || 'feedback').toUpperCase()}</strong> • {new Date(fb.timestamp).toLocaleDateString()} {new Date(fb.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  {fb.acknowledged ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px', fontWeight: 'bold' }}>
                      <CheckCircle size={16} /> Acknowledged
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAcknowledge(fb.id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
                
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {fb.feedback || fb.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
