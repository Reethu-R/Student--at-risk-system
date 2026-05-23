/**
 * pages/teacher/TeacherDashboard.jsx
 */
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: '#0f172a', border: `1px solid ${color}30`, borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 50, height: 50, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{value ?? '—'}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</p>
    </div>
  </div>
);

const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>Loading your dashboard...</div>;

  const { subjects = [], totalStudents, alerts, riskSummary = [] } = data || {};
  const pieColors = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };
  const pieData = riskSummary.map(r => ({ name: r.risk_level, value: r.count, color: pieColors[r.risk_level] }));

  return (
    <div style={s.page}>
      <h1 style={s.title}>Teacher Dashboard</h1>
      <p style={s.sub}>Your class performance overview</p>

      <div style={s.grid3}>
        <StatCard label="My Students" value={totalStudents} icon="🎓" color="#3b82f6" />
        <StatCard label="Subjects Assigned" value={subjects.length} icon="📚" color="#8b5cf6" />
        <StatCard label="Unread Alerts" value={alerts} icon="🔔" color="#ef4444" />
      </div>

      <div style={s.grid2}>
        {/* Subjects table */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>My Subjects</h3>
          {subjects.length === 0 ? (
            <p style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No subjects assigned yet.</p>
          ) : (
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Subject</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Semester</th>
                <th style={s.th}>Credits</th>
              </tr></thead>
              <tbody>
                {subjects.map(sub => (
                  <tr key={sub.subject_id} style={s.row}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#e2e8f0' }}>{sub.name}</td>
                    <td style={s.td}><code style={s.code}>{sub.subject_code}</code></td>
                    <td style={{ ...s.td, textAlign: 'center' }}>Sem {sub.semester}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{sub.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Risk pie */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Student Risk Distribution (Department)</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 40 }}>✅</span>
              <p style={{ color: '#22c55e', fontWeight: 700, margin: 0 }}>All students are safe!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '📅 Upload Attendance', path: '/teacher/attendance' },
            { label: '📝 Upload Marks', path: '/teacher/marks' },
            { label: '🔔 View Alerts', path: '/teacher/alerts' },
            { label: '👥 My Students', path: '/teacher/students' },
          ].map(a => (
            <a key={a.path} href={a.path} style={s.quickBtn}>{a.label}</a>
          ))}
        </div>
      </div>
    </div>
  );
};

const s = {
  page:      { padding: 28, maxWidth: 1400, margin: '0 auto' },
  title:     { margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  sub:       { margin: '6px 0 24px', fontSize: 14, color: '#64748b' },
  grid3:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  grid2:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 24 },
  card:      { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 0 },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b' },
  row:       { borderBottom: '1px solid #1e293b30' },
  td:        { padding: '11px 12px', fontSize: 13, color: '#cbd5e1' },
  code:      { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#60a5fa', fontFamily: 'monospace' },
  quickBtn:  { padding: '11px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#60a5fa', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'all 0.15s' },
};

export default TeacherDashboard;
