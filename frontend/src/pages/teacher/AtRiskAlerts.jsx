/**
 * pages/teacher/AtRiskAlerts.jsx
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_STYLE = {
  high:   { bg: '#ef444415', border: '#ef444440', color: '#ef4444', icon: '🔴' },
  medium: { bg: '#f9731615', border: '#f9731640', color: '#f97316', icon: '🟠' },
  low:    { bg: '#eab30815', border: '#eab30840', color: '#eab308', icon: '🟡' },
};

const AtRiskAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/teacher/my-alerts')
      .then(r => setAlerts(r.data.data))
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = alerts.filter(a => !filter || a.message?.toLowerCase().includes(filter.toLowerCase()));

  const getRisk = (msg = '') => {
    if (msg.includes('HIGH')) return 'high';
    if (msg.includes('MEDIUM') || msg.includes('medium')) return 'medium';
    return 'low';
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={s.title}>At-Risk Alerts</h1>
          <p style={s.sub}>{alerts.length} total alerts for your students</p>
        </div>
        <input style={s.search} placeholder="Search alerts..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: 64 }}>✅</span>
          <h2 style={{ color: '#22c55e', margin: '16px 0 8px' }}>No Alerts!</h2>
          <p style={{ color: '#475569', margin: 0 }}>All your students are performing well.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((alert, i) => {
            const level = getRisk(alert.message);
            const rs    = RISK_STYLE[level] || RISK_STYLE.low;
            return (
              <div key={i} style={{ ...s.alertCard, background: rs.bg, borderColor: rs.border }}>
                <div style={s.alertLeft}>
                  <span style={{ fontSize: 28 }}>{rs.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                      {alert.student_name}
                      <code style={{ marginLeft: 10, fontSize: 12, background: '#1e293b', padding: '2px 8px', borderRadius: 4, color: '#60a5fa' }}>{alert.roll_no}</code>
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{alert.message}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ ...s.badge, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>{level.toUpperCase()}</span>
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: '#475569' }}>
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const s = {
  page:      { padding: 28, maxWidth: 1000, margin: '0 auto' },
  title:     { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub:       { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  search:    { padding: '9px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 280, outline: 'none' },
  alertCard: { border: '1px solid', borderRadius: 12, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  alertLeft: { display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1 },
  badge:     { padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  empty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' },
};

export default AtRiskAlerts;
