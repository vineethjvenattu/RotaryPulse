import React from 'react';
import { Modal } from './Modal';
import { Star } from 'lucide-react';

export const UpgradeModal = ({ isOpen, onClose, onUpgrade }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Premium Required" maxWidth="400px">
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--rotary-gold)' }}>
          <Star size={32} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Unlock Contact Details</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.5' }}>
          Viewing contact information is a Premium feature. Upgrade to Premium to connect with members and grow your network.
        </p>
        <button 
          onClick={onUpgrade}
          style={{ width: '100%', padding: '12px', backgroundColor: 'var(--rotary-gold)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
        >
          Upgrade to Premium
        </button>
        <button 
          onClick={onClose}
          style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
        >
          Maybe Later
        </button>
      </div>
    </Modal>
  );
};
