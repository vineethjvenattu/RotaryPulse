import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, ShieldAlert, Settings, X, Users, Megaphone, ExternalLink } from 'lucide-react';
import { ChapterProfile } from './ChapterProfile';
import { Avatar } from '../components/Avatar';

export const SuperAdminDashboard = () => {
  const { logout, globalConfig } = useAuth();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // What's New State
  const [whatsNewTitle, setWhatsNewTitle] = useState('');
  const [whatsNewContent, setWhatsNewContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  
  // Create Chapter State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  
  // Navigation State
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [selectedChapterName, setSelectedChapterName] = useState('');

  // Global Roles State
  // Removed in favor of Global Config JSON

  // Global Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configJson, setConfigJson] = useState('');
  const [devCodes, setDevCodes] = useState([]);
  const [newDevCode, setNewDevCode] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

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

  const handlePublishWhatsNew = async (e) => {
    e.preventDefault();
    if (!whatsNewTitle || !whatsNewContent) return;
    
    setPublishing(true);
    const result = await api.publishWhatsNew(whatsNewTitle, whatsNewContent);
    setPublishing(false);
    
    if (result.success) {
      alert("Published successfully to all users!");
      setWhatsNewTitle('');
      setWhatsNewContent('');
    } else {
      alert("Failed to publish: " + result.error);
    }
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



  const openConfigModal = async () => {
    setShowConfigModal(true);
    const configRes = await api.getGlobalConfig();
    if (configRes.success) {
      setConfigJson(JSON.stringify(configRes.config, null, 2));
    } else {
      setConfigJson('{\n  "facebookPageId": "",\n  "fbAccessToken": ""\n}');
    }
    loadDevCodes();
  };

  const loadDevCodes = async () => {
    const res = await api.getActiveDevCodes();
    if (res.success) {
      setDevCodes(res.codes);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const parsedConfig = JSON.parse(configJson);
      const res = await api.saveGlobalConfig(parsedConfig);
      if (res.success) {
        alert("Global Config saved successfully.");
      } else {
        alert("Failed to save config: " + res.error);
      }
    } catch (e) {
      alert("Invalid JSON format");
    }
    setSavingConfig(false);
  };

  const handleAddDevCode = async () => {
    if (!newDevCode) return;
    const res = await api.createDevCode(newDevCode);
    if (res.success) {
      setNewDevCode('');
      loadDevCodes();
    } else {
      alert("Failed to create Dev Code: " + res.error);
    }
  };

  const handleDeleteDevCode = async (code) => {
    if (window.confirm(`Delete Dev Code ${code}?`)) {
      const res = await api.deleteDevCode(code);
      if (res.success) {
        loadDevCodes();
      } else {
        alert("Failed to delete Dev Code: " + res.error);
      }
    }
  };

  const handleDevCodeLogin = async (code) => {
    try {
      logout();
      window.location.href = `${window.location.origin}/?devCode=${code}`;
    } catch (err) {
      console.error("Failed to sign out for dev mode:", err);
    }
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
          <button onClick={openConfigModal} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} /> Global Config
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

      {/* WHAT'S NEW PUBLISHER */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px' }}>
            <Megaphone size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Publish "What's New"</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>Send updates or release notes to all members globally.</p>
          </div>
        </div>
        
        <form onSubmit={handlePublishWhatsNew} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label className="form-label">Update Title</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Version 1.2 Released" 
              value={whatsNewTitle}
              onChange={e => setWhatsNewTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Update Content (Release Notes)</label>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', backgroundColor: 'var(--bg-tertiary)', padding: '8px', borderRadius: '6px' }}>
              <strong>Formatting Guide (WhatsApp Style):</strong><br/>
              • Use <code>*bold*</code> for <strong>bold</strong> text<br/>
              • Use <code>_italic_</code> for <em>italic</em> text<br/>
              • Use <code>~strikethrough~</code> for <del>strikethrough</del><br/>
              • Each new line will automatically be rendered as a bullet point.
            </div>
            <textarea 
              className="form-control" 
              placeholder="Describe new features, bug fixes, or enhancements..." 
              value={whatsNewContent}
              onChange={e => setWhatsNewContent(e.target.value)}
              style={{ height: '120px', resize: 'vertical' }}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={publishing}>
            {publishing ? 'Publishing...' : 'Publish Update'}
          </button>
        </form>
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

      {/* GLOBAL CONFIG MODAL */}
      {showConfigModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowConfigModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Global Configurations</h2>
            
            <div className="form-group">
              <label className="form-label">Global Config JSON (e.g., FB Tokens)</label>
              <textarea 
                className="form-control"
                style={{ height: '200px', fontFamily: 'monospace', fontSize: '13px' }}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveConfig}
              disabled={savingConfig}
              style={{ width: '100%', marginBottom: '32px' }}
            >
              {savingConfig ? 'Saving...' : 'Save JSON Config'}
            </button>

            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Development / Test Codes</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Create codes to bypass mobile OTP during development. Valid for 24 hours.
            </p>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter new code (e.g., 999999)" 
                value={newDevCode}
                onChange={(e) => setNewDevCode(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddDevCode}>Add</button>
            </div>

            {devCodes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {devCodes.map(dc => (
                  <div key={dc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div>
                      <strong>{dc.code || dc.id}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Expires: {dc.expiresAt ? new Date(dc.expiresAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleDevCodeLogin(dc.code || dc.id)} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', color: 'var(--rotary-blue)' }}
                        title="Login as User with Dev Code"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDevCode(dc.id)} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', color: '#e74c3c' }}
                        title="Delete Dev Code"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No active dev codes.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
