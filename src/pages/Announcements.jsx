import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Bell, Plus, X, User } from 'lucide-react';
import { Modal } from '../components/Modal';
import './pages.css';

export const Announcements = ({ data, loading, refreshData }) => {
  const { currentUser, canManageEvents } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Announcements...</div>;
  }

  const { announcements = [] } = data;
  
  // Sort announcements chronologically (newest first)
  const sortedAnnouncements = [...announcements].sort((a, b) => b["Date"].localeCompare(a["Date"]));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setSubmitting(true);

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const result = await api.addAnnouncement({
        title,
        content,
        date: todayStr,
        createdBy: currentUser ? currentUser["Name"] : "Admin"
      });

      if (result.success) {
        setTitle('');
        setContent('');
        setShowAddModal(false);
        await refreshData();
      } else {
        setError(result.error || 'Failed to publish announcement');
      }
    } catch (err) {
      setError('Error publishing announcement');
    } finally {
      setSubmitting(false);
    }
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
          <h1>Club Announcements</h1>
          <p className="page-subtitle">Official news and notice board updates</p>
        </div>
        {canManageEvents && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary"
          >
            <Plus size={16} />
            Post Notice
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      {sortedAnnouncements.length > 0 ? (
        <div className="announcements-feed">
          {sortedAnnouncements.map((notice) => (
            <div key={notice["Announcement ID"]} className="card announcement-card">
              <div className="announcement-card-header">
                <h3 className="announcement-card-title">{notice["Title"]}</h3>
                <span className="announcement-card-date">{formatDisplayDate(notice["Date"])}</span>
              </div>
              <p className="announcement-card-content">{notice["Content"]}</p>
              <div className="announcement-card-footer">
                <User size={14} />
                <span>Posted by: {notice["Created By"]}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Bell size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>Notice board is currently empty.</p>
        </div>
      )}

      {/* POST ANNOUNCEMENT MODAL OVERLAY */}
      {/* ADD MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Publish Announcement"
        icon={<Bell size={22} style={{ color: 'var(--rotary-blue)' }} />}
      >
        {error && (
          <div className="login-error" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Notice Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Tree Plantation Drive Details"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Announcement Content *</label>
            <textarea
              className="form-control"
              style={{ height: '140px', resize: 'none' }}
              placeholder="Write the official notice details here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
