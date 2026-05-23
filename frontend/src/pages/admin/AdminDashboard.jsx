/**
 * pages/admin/AdminDashboard.jsx
 * System-wide stats for Admin — departments, risk distribution, audit trail
 */

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_COLORS = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: '#0f172a', border: `1px solid ${color}30`, borderRadius: 14, padding: '24px', display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 52, height: 52, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{value ?? '—'}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const { stats, deptRisk } = data || {};
  const pieData = [
    { name: 'High Risk',   value: stats?.high_risk_count   || 0, color: '#ef4444' },
    { name: 'Medium Risk', value: stats?.medium_risk_count || 0, color: '#f97316' },
    { name: 'Low Risk',    value: stats?.low_risk_count    || 0, color: '#eab308' },
    { name: 'Safe',        value: stats?.safe_count        || 0, color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>System Dashboard</h1>
        <p style={styles.sub}>Real-time overview across all departments</p>
      </div>

      {/* Stat cards */}
      <div style={styles.grid4}>
        <StatCard label="Total Students"   value={stats?.total_students}   icon="🎓" color="#3b82f6" />
        <StatCard label="Total Faculty"    value={stats?.total_faculty}    icon="👨‍🏫" color="#8b5cf6" />
        <StatCard label="Departments"      value={stats?.total_departments} icon="🏛️" color="#f59e0b" />
        <StatCard label="High Risk Today"  value={stats?.high_risk_count}  icon="⚠️" color="#ef4444" />
      </div>

      {/* Charts row */}
      <div style={styles.grid2}>
        {/* Dept bar chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Department-wise At-Risk Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deptRisk} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="code" tick={{ fill: '#64748b', fontSize: 12 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="high_risk"   name="High"   fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="medium_risk" name="Medium" fill="#f97316" radius={[4,4,0,0]} />
              <Bar dataKey="low_risk"    name="Low"    fill="#eab308" radius={[4,4,0,0]} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Overall Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={{ stroke: '#475569' }}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dept table */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Department Summary</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>{['Department','Code','Students','Faculty','High Risk','Medium Risk','Safe'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {deptRisk?.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={styles.td}>{d.department}</td>
                  <td style={styles.td}><span style={styles.codeBadge}>{d.code}</span></td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{d.student_count || 0}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{d.faculty_count || 0}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ color: '#ef4444', fontWeight: 700 }}>{d.high_risk || 0}</span></td>
                  <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ color: '#f97316', fontWeight: 700 }}>{d.medium_risk || 0}</span></td>
                  <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ color: '#22c55e', fontWeight: 700 }}>{d.safe || 0}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const styles = {
  page:       { padding: '28px', maxWidth: 1400, margin: '0 auto' },
  header:     { marginBottom: 28 },
  title:      { margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  sub:        { margin: '6px 0 0', fontSize: 14, color: '#64748b' },
  grid4:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  grid2:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 },
  chartCard:  { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 0 },
  chartTitle: { margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b' },
  td:         { padding: '12px 14px', fontSize: 14, color: '#cbd5e1' },
  codeBadge:  { background: '#1e293b', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#60a5fa' },
};

export default AdminDashboard;
