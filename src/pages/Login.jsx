import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RotaryLogo } from '../components/Navigation';
import { Mail, Lock, Key, AlertCircle } from 'lucide-react';
import './pages.css';

export const Login = () => {
  const { login, setupPin } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Set PIN Flow
  const [isSettingUpPin, setIsSettingUpPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const params = new URLSearchParams(window.location.search);
  const isDevMode = params.get('devCode') === 'amity2026';

  const handleQuickLogin = async (emailVal, pinVal) => {
    setError('');
    setLoading(true);
    try {
      const result = await login(emailVal, pinVal);
      if (!result.success) {
        if (result.needsPinSetup) {
          setEmail(emailVal);
          setIsSettingUpPin(true);
        } else {
          setError(result.error || 'Authentication failed');
        }
      }
    } catch (err) {
      setError('An error occurred during quick login');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !pin) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, pin);
      if (!result.success) {
        if (result.needsPinSetup) {
          setIsSettingUpPin(true);
        } else {
          setError(result.error || 'Authentication failed');
        }
      }
    } catch (err) {
      setError('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPinSubmit = async (e) => {
    e.preventDefault();
    if (!newPin || !confirmPin) {
      setError('Please fill in both PIN fields');
      return;
    }
    
    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await setupPin(email, newPin);
      if (!result.success) {
        setError(result.error || 'Failed to setup PIN');
      }
    } catch (err) {
      setError('An error occurred during PIN setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <RotaryLogo className="login-logo rotary-wheel" />
        
        <div className="login-header">
          <h1>Rotary Connect</h1>
          <p>Stronger Together, Serving Better</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!isSettingUpPin ? (
          <>
            <form onSubmit={handleLoginSubmit} className="animate-fade-in">
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail 
                    size={18} 
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
                  />
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: '44px' }}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="pin">Member PIN</label>
                <div style={{ position: 'relative' }}>
                  <Lock 
                    size={18} 
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
                  />
                  <input
                    id="pin"
                    type="password"
                    maxLength={6}
                    className="form-control"
                    style={{ paddingLeft: '44px' }}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {isDevMode && (
              <div className="dev-bypass-box animate-fade-in" style={{ marginTop: '24px', borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
                  🛠️ Developer Quick Bypass
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '8px 4px', fontWeight: 600 }}
                    onClick={() => handleQuickLogin('arjun.mehta@email.com', '1234')}
                    disabled={loading}
                  >
                    President (Arjun)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '8px 4px', fontWeight: 600 }}
                    onClick={() => handleQuickLogin('neha@email.com', '1111')}
                    disabled={loading}
                  >
                    Secretary (Neha)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '8px 4px', fontWeight: 600 }}
                    onClick={() => handleQuickLogin('sanjay@email.com', '2222')}
                    disabled={loading}
                  >
                    Treasurer (Sanjay)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '8px 4px', fontWeight: 600 }}
                    onClick={() => handleQuickLogin('priya@email.com', '3333')}
                    disabled={loading}
                  >
                    Member (Priya)
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSetupPinSubmit} className="animate-fade-in">
            <div className="login-error" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)' }}>
              <Key size={18} />
              <span>First-time Login: Please set your security PIN.</span>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" htmlFor="newPin">Create PIN (4-6 digits)</label>
              <input
                id="newPin"
                type="password"
                maxLength={6}
                className="form-control"
                placeholder="New PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" htmlFor="confirmPin">Confirm PIN</label>
              <input
                id="confirmPin"
                type="password"
                maxLength={6}
                className="form-control"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Saving PIN...' : 'Setup PIN & Sign In'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              onClick={() => {
                setIsSettingUpPin(false);
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
