import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Key, AlertCircle, Phone, ArrowLeft } from 'lucide-react';
import { Register } from './Register';
import { api } from '../services/api';
import logoImg from '../assets/rotary-logo.png';
import './pages.css';

export const Login = ({ onLoginSuccess }) => {
  const { login, setupPin } = useAuth();
  const [memberId, setMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  
  // View states: 'options' | 'email' | 'register'
  const [activeView, setActiveView] = useState('options');
  const [isSettingUpPin, setIsSettingUpPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Captcha state
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  const params = new URLSearchParams(window.location.search);
  const rawDevCode = params.get('devCode');
  const [isDevMode, setIsDevMode] = useState(false);
  const [devUsers, setDevUsers] = useState([]);

  useEffect(() => {
    const checkDevMode = async () => {
      console.log("Checking dev mode with rawDevCode:", rawDevCode);
      if (rawDevCode) {
        const res = await api.validateDevCode(rawDevCode);
        console.log("validateDevCode result:", res);
        if (res.success) {
          setIsDevMode(true);
          const usersRes = await api.getAllUsersForDev();
          console.log("getAllUsersForDev result:", usersRes);
          if (usersRes.success) setDevUsers(usersRes.users);
        } else {
          console.warn("Dev mode invalid:", res.error);
        }
      }
    };
    checkDevMode();
  }, [rawDevCode]);

  const handleQuickLogin = async (memberIdVal, pinVal) => {
    setError('');
    setLoading(true);
    try {
      const result = await login(memberIdVal, pinVal);
      if (!result.success) {
        if (result.needsPinSetup) {
          setMemberId(memberIdVal);
          setIsSettingUpPin(true);
        } else {
          setError(result.error || 'Authentication failed');
        }
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('An error occurred during quick login');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!memberId || !pin) {
      setError('Please fill in all fields');
      return;
    }
    
    if (parseInt(captchaInput) !== num1 + num2) {
      setCaptchaError(true);
      setError('Incorrect Captcha. Please try again.');
      generateCaptcha();
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await login(memberId, pin);
      if (!result.success) {
        if (result.needsPinSetup) {
          setIsSettingUpPin(true);
        } else {
          setError(result.error || 'Authentication failed');
        }
      } else if (onLoginSuccess) {
        onLoginSuccess();
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
      const result = await setupPin(memberId, newPin);
      if (!result.success) {
        setError(result.error || 'Failed to setup PIN');
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('An error occurred during PIN setup');
    } finally {
      setLoading(false);
    }
  };

  const handleMockClick = (provider) => {
    setError('');
    setInfo(`${provider} login is not configured for this demo database. Please use "Login with Member ID" below.`);
  };

  if (activeView === 'register') {
    return <Register onBackToLogin={() => setActiveView('options')} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {activeView === 'memberId' && !isSettingUpPin && (
          <button 
            type="button" 
            className="login-back-btn"
            onClick={() => {
              setActiveView('options');
              setError('');
              setInfo('');
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}
        <img 
          src="https://rotarytrivandrumamity.com/wp-content/uploads/2024/03/rotary_amity_logo1.png" 
          alt="Rotary Amity Logo" 
          className="login-logo" 
          style={{ width: '200px', height: 'auto', margin: '0 auto 24px', display: 'block', objectFit: 'contain' }} 
        />
        
        <div className="login-header">
          <h1>Rotary Pulse</h1>
          <p>The heartbeat of your Rotary Club</p>
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
                <label className="form-label" htmlFor="email">Member ID</label>
                <div style={{ position: 'relative' }}>
                  <Mail 
                    size={18} 
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
                  />
                  <input
                    id="memberId"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '44px' }}
                    placeholder="name@example.com"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
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

              {/* Captcha */}
              <div className="form-group" style={{ textAlign: 'left', marginTop: '15px' }}>
                <label className="form-label" htmlFor="captcha">Security Check: What is {num1} + {num2}?</label>
                <input
                  id="captcha"
                  type="text"
                  className={`form-control ${captchaError ? 'error-border' : ''}`}
                  placeholder="Enter answer"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value);
                    setCaptchaError(false);
                  }}
                  disabled={loading}
                  style={captchaError ? { borderColor: 'var(--error)' } : {}}
                />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select 
                    className="form-control" 
                    onChange={(e) => {
                      const selectedUser = devUsers.find(u => u["Member ID"] === e.target.value);
                      if (selectedUser) {
                        setMemberId(selectedUser["Member ID"]);
                        setPin(selectedUser.Pin || selectedUser["Password/PIN"] || '');
                      } else {
                        setMemberId('');
                        setPin('');
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a user to bypass login...</option>
                    {devUsers.map(u => (
                      <option key={u.id || u.Email} value={u["Member ID"]}>
                        {u.Name} ({u.Role || 'User'})
                      </option>
                    ))}
                  </select>
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
