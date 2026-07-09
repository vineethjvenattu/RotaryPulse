import React, { useState, useEffect } from 'react';
import { Mail, User, Phone, Lock, Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import logoImg from '../assets/rotary-logo.png';
import './pages.css';

export const Register = ({ onBackToLogin }) => {
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    chapterId: '',
    pin: '',
    confirmPin: '',
    referralCode: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchChapters = async () => {
      const result = await api.listAllChapters();
      if (result.success) {
        setChapters(result.chapters.filter(c => c.status === 'active'));
      }
      setLoadingChapters(false);
    };
    fetchChapters();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email || !formData.chapterId || !formData.pin) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    if (formData.pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    const result = await api.registerMember({
      Name: formData.name,
      Email: formData.email,
      Mobile: formData.mobile,
      chapterId: formData.chapterId,
      Pin: formData.pin,
      ReferredBy: formData.referralCode
    });
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <img src={logoImg} alt="Rotary Logo" className="login-logo" />
          <h2 style={{ marginBottom: '10px' }}>Registration Successful</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            Your request has been submitted to the Chapter President. You will be able to log in once your membership is approved.
          </p>
          <button className="btn btn-primary" onClick={onBackToLogin}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src={logoImg} alt="Rotary Logo" className="login-logo" style={{ width: '60px', height: '60px', marginBottom: '10px' }} />
          <h2>Join a Chapter</h2>
        </div>
        
        {error && <div className="login-error"><AlertCircle size={18} /> {error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="input-group">
            <User className="input-icon" size={20} />
            <input type="text" name="name" className="input-field" placeholder="Full Name" value={formData.name} onChange={handleChange} />
          </div>
          
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input type="email" name="email" className="input-field" placeholder="Email Address" value={formData.email} onChange={handleChange} />
          </div>

          <div className="input-group">
            <Phone className="input-icon" size={20} />
            <input type="tel" name="mobile" className="input-field" placeholder="Mobile Number (Optional)" value={formData.mobile} onChange={handleChange} />
          </div>

          <div className="input-group">
            <Building2 className="input-icon" size={20} />
            <select name="chapterId" className="input-field" value={formData.chapterId} onChange={handleChange} disabled={loadingChapters}>
              <option value="">Select a Chapter</option>
              {chapters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input type="password" name="pin" className="input-field" placeholder="Create a 4-Digit PIN" value={formData.pin} onChange={handleChange} maxLength={6} />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input type="password" name="confirmPin" className="input-field" placeholder="Confirm PIN" value={formData.confirmPin} onChange={handleChange} maxLength={6} />
          </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                name="referralCode"
                placeholder="Referral Code (Optional Member ID)" 
                className="input-field pl-10"
                value={formData.referralCode}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={onBackToLogin} className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};
