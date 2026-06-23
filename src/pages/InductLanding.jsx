import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoImg from '../assets/rotary-logo.png';
import { Building2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import './pages.css';

export const InductLanding = ({ inductChapterId, onBack }) => {
  const { currentUser, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (currentUser) {
      handleInduction(currentUser);
    }
  }, [currentUser]);

  const handleInduction = async (user) => {
    setLoading(true);
    setError('');
    
    // Check if user is already active in another chapter
    if (user.chapterId && user.chapterId !== inductChapterId && user.status === 'active') {
      setError(`You are already an active member of chapter: ${user.chapterId}. You cannot join a new chapter until you are removed from your current one.`);
      setLoading(false);
      return;
    }
    
    // Check if already in this chapter
    if (user.chapterId === inductChapterId && user.status === 'active') {
      setSuccess("You are already an active member of this chapter!");
      setLoading(false);
      return;
    }

    // Process induction
    const result = await api.inductMember(user["Member ID"], inductChapterId);
    setLoading(false);
    
    if (result.success) {
      setSuccess("Welcome! You have been successfully inducted into the chapter.");
    } else {
      setError(result.error || "Failed to process induction.");
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);
    
    const result = await login(email, pin);
    if (!result.success) {
      setError(result.error || "Authentication failed.");
      setIsAuthenticating(false);
    }
    // If successful, the useEffect on currentUser will trigger handleInduction
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <img src={logoImg} alt="Rotary Logo" className="login-logo" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
        <h2 style={{ marginBottom: '10px' }}>Chapter Invitation</h2>
        
        {success ? (
          <div>
            <CheckCircle size={48} color="#10b981" style={{ margin: '20px auto' }} />
            <p style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '30px' }}>{success}</p>
            <button className="btn btn-primary" onClick={onBack}>Go to Dashboard</button>
          </div>
        ) : error ? (
          <div>
            <AlertCircle size={48} color="#ef4444" style={{ margin: '20px auto' }} />
            <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '30px' }}>{error}</p>
            <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
          </div>
        ) : !currentUser ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Please log in to accept the invitation to chapter: <strong>{inductChapterId}</strong>
            </p>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="email" className="input-field" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" className="input-field" placeholder="4-Digit PIN" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} required />
              <button type="submit" className="login-button" disabled={isAuthenticating}>
                {isAuthenticating ? 'Authenticating...' : 'Log in to Join'}
              </button>
            </form>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={onBack}>Cancel</button>
          </div>
        ) : (
          <div>
            <p>Processing your induction...</p>
          </div>
        )}
      </div>
    </div>
  );
};
