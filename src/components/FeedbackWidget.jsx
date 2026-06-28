import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { api } from '../services/api';

export const FeedbackWidget = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!currentUser) return null;

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setStatusMsg('');
    try {
      const res = await api.submitFeedback(
        currentUser["Member ID"], 
        currentUser.Name, 
        feedback, 
        currentUser.chapterId || "amity-tvm"
      );
      if (res.success) {
        setStatusMsg("Feedback submitted successfully! Thank you.");
        setFeedback('');
        setTimeout(() => {
          setIsOpen(false);
          setStatusMsg('');
        }, 2000);
      } else {
        setStatusMsg("Failed to submit feedback.");
      }
    } catch (e) {
      setStatusMsg("An error occurred.");
    }
    setSubmitting(false);
  };

  return (
    <>
      <button 
        className="feedback-btn-floating"
        onClick={() => setIsOpen(true)}
        title="Send Feedback"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Send Feedback</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#666" />
              </button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
              Facing an issue or have a suggestion? Let the Admin and Core Committee know.
            </p>
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe your issue or feedback here..."
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                resize: 'none',
                marginBottom: '16px',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
            
            {statusMsg && (
              <div style={{ marginBottom: '16px', fontSize: '13px', color: statusMsg.includes('success') ? '#2e7d32' : '#d32f2f' }}>
                {statusMsg}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={submitting || !feedback.trim()}
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('root') || document.body
      )}
    </>
  );
};
