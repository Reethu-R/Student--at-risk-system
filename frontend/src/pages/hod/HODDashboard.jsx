/**
 * pages/hod/HODDashboard.jsx
 */
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

const PIE_COLORS = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };

const HODDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hod/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>Loading department data...</div>;

  const { stats, riskBySemester } = data || {};
  const pieData = [
    { name: 'High',   value: stats?.high_risk   || 0, color: '#ef4444' },
    { name: 'Medium', value: stats?.medium_risk  || 0, color: '#f97316' },
  ].filter(d => d.value > 0);

  const handleDownload = async () => {
    try {
      const res = await api.get('/hod/download-report', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'dept-report.pdf'; a.click();
    } catch { toast.error('Download failed'); }
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={s.title}>Department Dashboard</h1>
          <p style={s.sub}>Your department's academic overview</p>
        </div>
        <button onClick={handleDownload} style={s.dlBtn}>⬇ Download Report (PDF)</button>
      </div>

      <div style={s.grid4}>
        <StatCard label="Total Students" value={stats?.total_students} icon="🎓" color="#3b82f6" />
        <StatCard label="Total Faculty"  value={stats?.total_faculty}  icon="👨‍🏫" color="#8b5cf6" />
        <StatCard label="High Risk"      value={stats?.high_risk}      icon="🔴" color="#ef4444" />
        <StatCard label="Medium Risk"    value={stats?.medium_risk}    icon="🟠" color="#f97316" />
      </div>

      <div style={s.grid2}>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Risk by Semester</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskBySemester} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="semester" tickFormatter={v => `Sem ${v}`} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="high_risk"   name="High"   fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="medium_risk" name="Medium" fill="#f97316" radius={[4,4,0,0]} />
              <Bar dataKey="low_risk"    name="Low"    fill="#eab308" radius={[4,4,0,0]} />
              <Bar dataKey="safe"        name="Safe"   fill="#22c55e" radius={[4,4,0,0]} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={s.card}>
          <h3 style={s.cardTitle}>At-Risk Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 48 }}>✅</span>
              <p style={{ color: '#22c55e', fontWeight: 700, margin: 0 }}>No at-risk students!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const s = {
  page:      { padding: 28, maxWidth: 1400, margin: '0 auto' },
  title:     { margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  sub:       { margin: '6px 0 0', fontSize: 14, color: '#64748b' },
  grid4:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  grid2:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 },
  card:      { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24 },
  cardTitle: { margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  dlBtn:     { padding: '10px 20px', background: 'linear-gradient(135deg,#065f46,#10b981)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};

export default HODDashboard;
