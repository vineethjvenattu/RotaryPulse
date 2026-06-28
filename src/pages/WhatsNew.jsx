import React, { useState, useEffect } from 'react';
import { Bell, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import './pages.css';

export const WhatsNew = ({ setActiveTab }) => {
  const [whatsNew, setWhatsNew] = useState([]);

  useEffect(() => {
    const unsubscribeWhatsNew = api.subscribeToWhatsNew((notifications) => {
      setWhatsNew(notifications);
    });
    return () => {
      if (unsubscribeWhatsNew) unsubscribeWhatsNew();
    };
  }, []);

  const formatWhatsAppText = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {lines.map((line, i) => {
          const parts = line.split(/(\*.*?\*|_.*?_|~.*?~)/g);
          return (
            <li key={i} style={{ marginBottom: '4px' }}>
              {parts.map((part, j) => {
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                  return <em key={j}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
                  return <del key={j}>{part.slice(1, -1)}</del>;
                }
                return part;
              })}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className="btn btn-secondary" 
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="page-title" style={{ margin: 0 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Bell size={24} />
            What's new in this release
          </h1>
          <p className="page-subtitle" style={{ margin: 0, marginTop: '4px' }}>All recent updates and release notes</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {whatsNew.length > 0 ? (
          whatsNew.map((wn) => (
            <div key={wn.id} className="card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--rotary-blue)' }}>{wn.title}</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(wn.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px' }}>
                {formatWhatsAppText(wn.content)}
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No release notes found.
          </div>
        )}
      </div>
    </div>
  );
};
