/**
 * components/Sidebar.jsx
 * Role-adaptive sidebar navigation
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MENUS = {
  admin: [
    { label: 'Dashboard',   path: '/admin/dashboard',  icon: '📊' },
    { label: 'Departments', path: '/admin/departments', icon: '🏛️' },
    { label: 'Faculty',     path: '/admin/faculty',     icon: '👨‍🏫' },
    { label: 'Students',    path: '/admin/students',    icon: '🎓' },
    { label: 'Audit Logs',  path: '/admin/audit',       icon: '📋' },
    { label: 'Thresholds',  path: '/admin/thresholds',  icon: '⚙️' },
  ],
  hod: [
    { label: 'Dashboard',   path: '/hod/dashboard',    icon: '📊' },
    { label: 'Teachers',    path: '/hod/teachers',     icon: '👨‍🏫' },
    { label: 'Students',    path: '/hod/students',     icon: '🎓' },
    { label: 'Attendance',  path: '/hod/attendance',   icon: '📅' },
    { label: 'Marks',       path: '/hod/marks',        icon: '📝' },
    { label: 'At-Risk',     path: '/hod/atrisk',       icon: '⚠️' },
  ],
  teacher: [
    { label: 'Dashboard',   path: '/teacher/dashboard',  icon: '📊' },
    { label: 'My Students', path: '/teacher/students',   icon: '🎓' },
    { label: 'Attendance',  path: '/teacher/attendance', icon: '📅' },
    { label: 'Marks',       path: '/teacher/marks',      icon: '📝' },
    { label: 'Alerts',      path: '/teacher/alerts',     icon: '🔔' },
  ],
  student: [
    { label: 'Dashboard',   path: '/student/dashboard',  icon: '📊' },
    { label: 'Attendance',  path: '/student/attendance', icon: '📅' },
    { label: 'Marks',       path: '/student/marks',      icon: '📝' },
    { label: 'Risk Status', path: '/student/risk',       icon: '🛡️' },
    { label: 'Alerts',      path: '/student/alerts',     icon: '🔔' },
  ],
};

const ROLE_COLORS = {
  admin:   '#f59e0b',
  hod:     '#8b5cf6',
  teacher: '#10b981',
  student: '#3b82f6',
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = MENUS[user?.role] || [];
  const color = ROLE_COLORS[user?.role] || '#3b82f6';

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <aside style={{ ...styles.sidebar, width: collapsed ? '72px' : '240px' }}>
      {/* Header */}
      <div style={styles.header}>
        {!collapsed && (
          <div style={styles.brand}>
            <div style={{ ...styles.brandDot, background: color }} />
            <span style={styles.brandText}>PES Trust ERP</span>
          </div>
        )}
        <button onClick={onToggle} style={styles.toggleBtn}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* User badge */}
      <div style={styles.userBadge}>
        <div style={{ ...styles.avatar, background: color }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={styles.userName}>{user?.name}</p>
            <span style={{ ...styles.roleTag, background: `${color}22`, color }}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? `${color}18` : 'transparent',
              borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
              color: isActive ? color : '#94a3b8',
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout} style={styles.logoutBtn}>
        <span>🚪</span>
        {!collapsed && <span>Sign Out</span>}
      </button>
    </aside>
  );
};

const styles = {
  sidebar: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.07)',
    transition: 'width 0.25s ease', overflow: 'hidden', flexShrink: 0,
    position: 'sticky', top: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' },
  brandDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  brandText: { fontSize: '14px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' },
  toggleBtn: {
    background: 'rgba(255,255,255,0.05)', border: 'none', color: '#64748b',
    width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  userBadge: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 700, fontSize: '15px', flexShrink: 0,
  },
  userName: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  roleTag: { fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
    fontSize: '14px', fontWeight: 500, transition: 'all 0.15s', cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navIcon: { fontSize: '18px', flexShrink: 0 },
  navLabel: { overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '12px',
    margin: '8px', padding: '10px 12px', borderRadius: '8px',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#ef4444', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
};

export default Sidebar;
