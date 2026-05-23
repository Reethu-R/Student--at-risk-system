/**
 * pages/Login.jsx
 * Login page — works for all 4 roles
 * Role auto-detected from JWT after login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_REDIRECTS = {
  admin:   '/admin/dashboard',
  hod:     '/hod/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(ROLE_REDIRECTS[user.role] || '/');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Animated background */}
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow} />

      <div style={styles.card}>
        {/* Logo area */}
        <div style={styles.logoArea}>
          <div style={styles.logoMark}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="url(#grad)"/>
              <path d="M18 8L28 13V19C28 24.5 23.5 28.5 18 30C12.5 28.5 8 24.5 8 19V13L18 8Z" fill="white" fillOpacity="0.9"/>
              <path d="M15 18L17 20L21 16" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#1e40af"/>
                  <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 style={styles.orgName}>PES Trust</h1>
            <p style={styles.systemName}>Student Risk Analysis System</p>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.heading}>Sign in to your account</h2>
        <p style={styles.subheading}>Enter your institutional credentials</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                style={styles.input}
                type="email"
                placeholder="your.id@pestrust.edu.in"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                style={styles.input}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: 8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Role hint */}
        <div style={styles.roleHints}>
          {['Admin', 'HOD', 'Teacher', 'Student'].map(role => (
            <span key={role} style={styles.roleChip}>{role}</span>
          ))}
        </div>

        <p style={styles.footer}>
          © {new Date().getFullYear()} PES Trust Educational Institutions
        </p>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060f1e',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(30,64,175,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.07) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  bgGlow: {
    position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
    width: '600px', height: '600px',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '20px',
    padding: '48px',
    width: '100%', maxWidth: '440px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' },
  logoMark: { flexShrink: 0 },
  orgName:  { margin: 0, fontSize: '20px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' },
  systemName: { margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 },
  divider:  { height: '1px', background: 'rgba(59,130,246,0.15)', margin: '24px 0' },
  heading:  { margin: '0 0 6px', fontSize: '22px', fontWeight: 700, color: '#f1f5f9' },
  subheading: { margin: '0 0 28px', fontSize: '14px', color: '#64748b' },
  form:     { display: 'flex', flexDirection: 'column', gap: '20px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label:    { fontSize: '13px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '14px', color: '#475569', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '12px 14px 12px 42px',
    background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.5)',
    borderRadius: '10px', fontSize: '14px', color: '#f1f5f9',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: '12px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '13px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px',
    fontWeight: 700, cursor: 'pointer', marginTop: '8px',
    transition: 'all 0.2s', letterSpacing: '0.3px',
  },
  spinner: {
    width: '20px', height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  roleHints: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px', justifyContent: 'center' },
  roleChip: {
    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)', letterSpacing: '0.5px',
  },
  footer: { textAlign: 'center', fontSize: '12px', color: '#334155', marginTop: '24px' },
};

export default Login;
