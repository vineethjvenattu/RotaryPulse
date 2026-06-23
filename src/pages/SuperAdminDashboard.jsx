import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, ShieldAlert, Settings, X, Users } from 'lucide-react';
import { ChapterProfile } from './ChapterProfile';
import { Avatar } from '../components/Avatar';

export const SuperAdminDashboard = () => {
  const { logout } = useAuth();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Chapter State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  
  // Navigation State
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [selectedChapterName, setSelectedChapterName] = useState('');

  // Global Roles State
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [globalRolesString, setGlobalRolesString] = useState('');
  const [savingRoles, setSavingRoles] = useState(false);

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    setLoading(true);
    const result = await api.listAllChapters();
    if (result.success) {
      const rolesRes = await api.getGlobalRoles();
      const globalRoles = rolesRes.success ? rolesRes.roles : ['President', 'Secretary', 'Treasurer'];
      const topRoles = globalRoles.slice(0, 3);
      
      const enrichedChapters = await Promise.all(result.chapters.map(async (chapter) => {
        const memRes = await api.getChapterMembers(chapter.id);
        const members = memRes.success ? memRes.members : [];
        const topMembers = topRoles.map(role => members.find(m => m.Role === role)).filter(Boolean);
        return { ...chapter, memberCount: members.length, topMembers };
      }));
      setChapters(enrichedChapters);
    }
    setLoading(false);
  };

  const handleCreateChapter = async () => {
    if (!newChapterName.trim()) return;
    const chapterId = newChapterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await api.createChapter(chapterId, newChapterName);
    if (result.success) {
      setShowCreateModal(false);
      setNewChapterName('');
      loadChapters();
    } else {
      alert("Error: " + result.error);
    }
  };

  const openGlobalRolesModal = async () => {
    setShowRolesModal(true);
    const res = await api.getGlobalRoles();
    if (res.success) {
      setGlobalRolesString(res.roles.join(', '));
    }
  };

  const saveGlobalRoles = async () => {
    setSavingRoles(true);
    const rolesArray = globalRolesString.split(',').map(r => r.trim()).filter(r => r !== '');
    const res = await api.saveGlobalRoles(rolesArray);
    if (res.success) {
      setShowRolesModal(false);
    } else {
      alert("Failed to save roles: " + res.error);
    }
    setSavingRoles(false);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Super Admin Dashboard...</div>;
  }

  // Render the Chapter Profile view if a chapter is selected
  if (selectedChapterId) {
    return (
      <ChapterProfile 
        chapterId={selectedChapterId} 
        chapterName={selectedChapterName} 
        onBack={() => setSelectedChapterId(null)} 
      />
    );
  }

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--rotary-blue-dark)', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          <ShieldAlert size={28} color="var(--rotary-gold)" /> Super Admin Panel
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={openGlobalRolesModal} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} /> Manage Roles
          </button>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 16px', fontWeight: 600 }}>Logout</button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rotary-blue-dark)', margin: 0 }}>Global Chapters</h3>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Create Chapter
          </button>
        </div>

        {chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
            <Building2 size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>No chapters exist. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chapters.map(c => (
              <div 
                key={c.id} 
                onClick={() => {
                  setSelectedChapterId(c.id);
                  setSelectedChapterName(c.name);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  padding: '20px', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>ID: {c.id}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={20} color="var(--rotary-blue)" /> {c.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '16px' }}>
                    <Users size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{c.memberCount || 0} Members</span>
                  </div>
                </div>
                {c.topMembers && c.topMembers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                    {c.topMembers.map((tm, idx) => (
                      <div 
                        key={tm["Member ID"]} 
                        style={{ 
                          marginLeft: idx > 0 ? '-10px' : '0',
                          zIndex: 10 - idx,
                        }}
                        title={`${tm.Role}: ${tm.Name}`}
                      >
                        <Avatar member={tm} size={24} className="sa-card-avatar" style={{ border: '2px solid var(--bg-tertiary)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE CHAPTER MODAL */}
      {showCreateModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <button className="drawer-close" onClick={() => setShowCreateModal(false)}><X size={24} /></button>
            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Create New Chapter</h2>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Chapter Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Rotary Club of Trivandrum"
                value={newChapterName} 
                onChange={e => setNewChapterName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateChapter}>Create Chapter</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MANAGE GLOBAL ROLES MODAL */}
      {showRolesModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <button className="drawer-close" onClick={() => setShowRolesModal(false)}><X size={24} /></button>
            <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>Global Chapter Roles</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Define the leadership roles that will appear on every chapter's profile page. Separate roles with a comma.
            </p>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Roles (Comma Separated)</label>
              <textarea 
                className="form-input" 
                rows={4}
                value={globalRolesString} 
                onChange={e => setGlobalRolesString(e.target.value)}
                placeholder="President, Secretary, Treasurer..."
                style={{ width: '100%', boxSizing: 'border-box', maxWidth: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRolesModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveGlobalRoles} disabled={savingRoles}>
                {savingRoles ? 'Saving...' : 'Save Roles'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
