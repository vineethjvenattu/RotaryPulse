import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  footer,
  maxWidth = '500px',
  hideCloseButton = false,
  zIndex = 9999
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay"
      style={{ 
        zIndex: zIndex, 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        backdropFilter: 'blur(4px)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0 
      }} 
      onClick={onClose}
    >
      <div 
        className="animate-slide-up" 
        style={{ 
          backgroundColor: 'white', 
          borderTopLeftRadius: '24px', 
          borderTopRightRadius: '24px', 
          width: '100%', 
          maxWidth: maxWidth, 
          margin: 'auto auto 0 auto',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ backgroundColor: 'var(--rotary-blue)', padding: '24px', position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '48px', height: '5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '10px', margin: '0 auto 16px' }}></div>
          {!hideCloseButton && (
            <button 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }} 
              onClick={onClose}
            >
              <X size={20} />
            </button>
          )}
          {title && <h2 style={{ marginBottom: subtitle ? '4px' : '0', fontSize: '22px', fontWeight: 700, color: 'white' }}>{title}</h2>}
          {subtitle && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{subtitle}</p>}
        </div>
        
        <div style={{ overflowY: 'auto', padding: '24px', flexGrow: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', display: 'flex', gap: '12px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.getElementById('root') || document.body
  );
};
