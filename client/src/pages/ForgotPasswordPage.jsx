import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from '../styles/ForgotPasswordPage.module.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  // Prefill from a previous attempt (set in localStorage elsewhere in the flow)
  const [email, setEmail] = useState(() => localStorage.getItem('resetEmail') || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) return setError('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Valid email required');

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      // Save email to localStorage
      localStorage.setItem('resetEmail', email);
      setStep('otp');
    } catch {
      // Still move to OTP step — backend always returns 200 to prevent email enumeration
      localStorage.setItem('resetEmail', email);
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) return setError('OTP is required');
    if (!/^\d{6}$/.test(otp)) return setError('OTP must be a 6-digit number');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      // Save email and token for reset password page
      localStorage.setItem('resetEmail', email);
      localStorage.setItem('resetToken', data.resetToken);
      navigate(`/reset-password/${data.resetToken}`);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP is invalid or has expired');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Enter OTP</h1>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
              The code expires in 1 minute.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleOtpSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>One-Time Password</label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                autoFocus
              />
              {error && <span className={styles.errorMessage}>{error}</span>}
            </div>

            <button className={styles.button} type="submit" disabled={loading}>
              {loading && <span className={styles.loadingSpinner} />}
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className={styles.footer}>
            <button
              className={styles.footerLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Forgot Password?</h1>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a code to reset your password.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleEmailSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading && <span className={styles.loadingSpinner} />}
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.footerLink}>Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
