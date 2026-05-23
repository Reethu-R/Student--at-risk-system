/**
 * components/Navbar.jsx
 * Top navigation bar — breadcrumb + real-time alert badge + profile
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const BREADCRUMB_MAP = {
  'dashboard': 'Dashboard', 'faculty': 'Faculty', 'students': 'Students',
  'attendance': 'Attendance', 'marks': 'Marks', 'atrisk': 'At-Risk Students',
  'alerts': 'Alerts', 'teachers': 'Teachers', 'audit': 'Audit Logs',
  'thresholds': 'Risk Thresholds', 'departments': 'Departments',
  'risk': 'Risk Status',
};

const Navbar = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map(s => BREADCRUMB_MAP[s] || s.charAt(0).toUpperCase() + s.slice(1));

  // Socket.io for real-time alerts
  useEffect(() => {
    if (!token || !user) return;

    const socket = io('/', {
      auth:         { token },
      transports:   ['websocket'],
    });

    socket.on('risk:alert', (data) => {
      setAlertCount(c => c + 1);
      toast.custom((t) => (
        <div style={{
          background: '#1e293b', border: '1px solid #f59e0b',
          borderRadius: '12px', padding: '14px 18px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          maxWidth: '360px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '14px' }}>
              At-Risk Alert
            </p>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              {data.student_name} ({data.roll_no}) — <strong style={{ color: data.risk_level === 'high' ? '#ef4444' : '#f59e0b' }}>{data.risk_level?.toUpperCase()} RISK</strong>
            </p>
          </div>
        </div>
      ), { duration: 6000 });
    });

    socket.on('upload:complete', (data) => {
      toast.success(data.message, { duration: 5000 });
    });

    socket.on('upload:error', (data) => {
      toast.error(data.message, { duration: 5000 });
    });

    return () => socket.disconnect();
  }, [token, user]);

  return (
    <header style={styles.navbar}>
      {/* Breadcrumb */}
      <nav style={styles.breadcrumb}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={styles.sep}>/</span>}
            <span style={{ ...styles.crumb, color: i === breadcrumbs.length - 1 ? '#f1f5f9' : '#475569' }}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right side */}
      <div style={styles.right}>
        {/* Alert bell */}
        <button style={styles.iconBtn} onClick={() => setAlertCount(0)}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {alertCount > 0 && (
            <span style={styles.badge}>{alertCount > 99 ? '99+' : alertCount}</span>
          )}
        </button>

        {/* User info */}
        <div style={styles.userInfo}>
          <p style={styles.uName}>{user?.name}</p>
          <p style={styles.uRole}>{user?.role?.toUpperCase()}</p>
        </div>
      </div>
    </header>
  );
};

const styles = {
  navbar: {
    height: '60px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 24px',
    background: 'rgba(15,23,42,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100,
  },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px' },
  sep:   { color: '#334155', fontSize: '14px' },
  crumb: { fontSize: '14px', fontWeight: 500 },
  right: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconBtn: {
    position: 'relative', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    width: '38px', height: '38px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    background: '#ef4444', color: 'white', borderRadius: '10px',
    fontSize: '10px', fontWeight: 700, padding: '1px 5px', minWidth: '16px',
    textAlign: 'center',
  },
  userInfo: { textAlign: 'right' },
  uName:   { margin: 0, fontSize: '13px', fontWeight: 600, color: '#e2e8f0' },
  uRole:   { margin: 0, fontSize: '10px', color: '#475569', letterSpacing: '0.5px' },
};

export default Navbar;
