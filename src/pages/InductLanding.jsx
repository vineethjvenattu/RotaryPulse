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
  
  const [memberId, setMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Guest Registration State
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestPin, setGuestPin] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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
    
    const result = await login(memberId, pin);
    if (!result.success) {
      setError(result.error || "Authentication failed.");
      setIsAuthenticating(false);
    }
    // If successful, the useEffect on currentUser will trigger handleInduction
  };

  const handleGuestRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);

    if (!guestName || !guestEmail || !guestPin) {
      setError('Please fill in required fields.');
      setIsRegistering(false);
      return;
    }

    if (guestPin.length < 4) {
      setError('PIN must be at least 4 digits');
      setIsRegistering(false);
      return;
    }

    const generatedId = `GUEST-${Date.now().toString().slice(-6)}`;
    
    // Register the user
    const regResult = await api.registerUser(
      generatedId,
      guestName,
      guestEmail,
      guestMobile,
      'Guest',
      'Guest',
      guestPin
    );

    if (!regResult.success) {
      setError(regResult.error || 'Failed to register as guest.');
      setIsRegistering(false);
      return;
    }

    // After registration, log them in automatically
    const loginResult = await login(generatedId, guestPin);
    if (!loginResult.success) {
      setError('Registration successful, but failed to log in automatically.');
      setIsRegistering(false);
    }
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
          showGuestForm ? (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Register as a Non-Rotarian / Guest
              </p>
              <form onSubmit={handleGuestRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="input-field" placeholder="John Doe" value={guestName} onChange={e => setGuestName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input type="email" className="input-field" placeholder="john@example.com" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Mobile Number</label>
                  <input type="tel" className="input-field" placeholder="+1234567890" value={guestMobile} onChange={e => setGuestMobile(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Create a 4-6 Digit PIN *</label>
                  <input type="password" className="input-field" placeholder="••••" value={guestPin} onChange={e => setGuestPin(e.target.value)} maxLength={6} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isRegistering}>
                  {isRegistering ? 'Registering...' : 'Register & Join'}
                </button>
              </form>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setShowGuestForm(false)} disabled={isRegistering}>Back to Login</button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Please log in to accept the invitation to chapter: <strong>{inductChapterId}</strong>
              </p>
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" className="input-field" placeholder="Member ID" value={memberId} onChange={e => setMemberId(e.target.value)} required />
                <input type="password" className="input-field" placeholder="4-Digit PIN" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} required />
                <button type="submit" className="login-button" disabled={isAuthenticating}>
                  {isAuthenticating ? 'Authenticating...' : 'Log in to Join'}
                </button>
              </form>
              <div style={{ margin: '20px 0', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-primary)', padding: '0 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>OR</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', marginBottom: '10px' }} 
                onClick={() => { setError(''); setShowGuestForm(true); }}
              >
                Register as Non-Rotarian / Guest
              </button>
              <button className="btn" style={{ width: '100%', color: 'var(--text-secondary)' }} onClick={onBack}>Cancel</button>
            </div>
          )
        ) : (
          <div>
            <p>Processing your induction...</p>
          </div>
        )}
      </div>
    </div>
  );
};
