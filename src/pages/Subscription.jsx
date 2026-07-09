import React, { useState, useEffect } from 'react';
import { CreditCard, QrCode, Lock, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './pages.css';

export const Subscription = () => {
  const { currentUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, failed, redirecting
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let timer;
    if (paymentStatus === 'pending' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      setPaymentStatus('failed');
    }
    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus]);

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // In a real app, you would listen for real-time updates on the user document
  // to detect when the webhook has successfully updated the subscription status.
  useEffect(() => {
    if (currentUser?.subscriptionStatus === 'Active' && paymentStatus !== 'success') {
      setPaymentStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }, [currentUser?.subscriptionStatus, paymentStatus]);

  const handleSubscribe = async () => {
    setLoading(true);
    setErrorMsg('');
    const planId = import.meta.env.VITE_RAZORPAY_PLAN_ID || 'plan_default'; // Replace with actual plan ID logic

    const res = await api.createRazorpaySubscription(planId, currentUser.chapterId, currentUser["Member ID"] || currentUser.id);
    
    if (res.success && res.data?.shortUrl) {
      setPaymentStatus('redirecting');
      window.open(res.data.shortUrl, '_blank');
      // Set to pending to wait for webhook
      setTimeout(() => setPaymentStatus('pending'), 3000);
    } else {
      setErrorMsg(res.error || 'Failed to initiate subscription');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setTimeLeft(300);
    setPaymentStatus('pending');
    setErrorMsg('');
  };

  if (currentUser?.subscriptionStatus === 'Active') {
    return (
      <div className="content-area animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div className="card" style={{ padding: '48px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success)', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Subscription Active</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Your ₹100/month mandate is active. Next billing date: {currentUser.subscriptionExpiry ? new Date(currentUser.subscriptionExpiry).toLocaleDateString() : 'N/A'}.
          </p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()} style={{ width: '100%' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
      
      <div className="card" style={{ maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '32px', color: 'white', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginBottom: '16px' }}>
            <Lock size={28} style={{ color: '#fbbf24' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>Unlock Premium Features</h2>
          <p style={{ opacity: 0.8, fontSize: '15px', lineHeight: '1.5' }}>
            Set up your ₹100/month UPI AutoPay mandate to access the Business Directory, Marketplace, and full Member List.
          </p>
        </div>

        <div style={{ padding: '32px', textAlign: 'center' }}>
          
          {paymentStatus === 'pending' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--rotary-blue)', fontWeight: 600, fontSize: '18px', marginBottom: '24px' }}>
                <Clock size={20} /> Time Remaining: {formatTime(timeLeft)}
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subscription Plan</span>
                  <span style={{ fontWeight: 600 }}>Rotary Connect Premium</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Billing Cycle</span>
                  <span style={{ fontWeight: 600 }}>Monthly</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Total (AutoPay)</span>
                  <span style={{ fontWeight: 700, color: 'var(--rotary-blue)', fontSize: '20px' }}>₹100</span>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Set up your mandate to authorize the ₹100 monthly deduction.
              </p>

              {errorMsg && <div style={{ color: 'red', marginBottom: '16px' }}>{errorMsg}</div>}

              <button 
                className="btn btn-primary" 
                onClick={handleSubscribe} 
                disabled={loading}
                style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CreditCard size={18} /> {loading ? 'Processing...' : 'Pay via Razorpay'}
              </button>
            </>
          )}

          {paymentStatus === 'redirecting' && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Redirecting to Razorpay...</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Please complete the payment in the new tab.</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="animate-scale-in" style={{ padding: '24px 0' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle2 size={48} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Payment Successful!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Your UPI Mandate is set up. Redirecting you to the dashboard...</p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="animate-fade-in" style={{ padding: '24px 0' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Clock size={48} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Session Expired</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>The 5-minute window to scan the QR code has expired.</p>
              <button className="btn btn-primary" onClick={handleRetry} style={{ padding: '12px 32px' }}>
                Try Again
              </button>
            </div>
          )}

        </div>
        
        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
          Secured by Razorpay Subscriptions. You can cancel your mandate at any time from your UPI app.
        </div>
      </div>
    </div>
  );
};
