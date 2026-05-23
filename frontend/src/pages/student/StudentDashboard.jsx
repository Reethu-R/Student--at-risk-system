/**
 * pages/student/StudentDashboard.jsx
 */
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_CONFIG = {
  high:   { bg: '#ef444418', border: '#ef4444', color: '#ef4444', label: '🔴 HIGH RISK', msg: 'Urgent: Contact your HOD immediately.' },
  medium: { bg: '#f9731618', border: '#f97316', color: '#f97316', label: '🟠 MEDIUM RISK', msg: 'Attention needed. Improve your attendance and marks.' },
  low:    { bg: '#eab30818', border: '#eab308', color: '#eab308', label: '🟡 LOW RISK', msg: 'On the borderline. Focus to improve your performance.' },
  safe:   { bg: '#22c55e18', border: '#22c55e', color: '#22c55e', label: '🟢 SAFE', msg: 'Great job! Keep up the good work.' },
};

const StudentDashboard = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    try {
      const res = await api.get('/student/download-report', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'my-report.pdf'; a.click();
    } catch { toast.error('Download failed'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>Loading your dashboard...</div>;

  const { student, risk, attSummary = [], marksSummary = [] } = data || {};
  const rc = RISK_CONFIG[risk?.risk_level] || RISK_CONFIG.safe;

  // Build marks line chart data
  const marksLineData = marksSummary.reduce((acc, m) => {
    const existing = acc.find(a => a.subject === m.subject);
    if (existing) existing[m.exam_type] = m.pct;
    else acc.push({ subject: m.subject.substring(0, 10), [m.exam_type]: m.pct });
    return acc;
  }, []);

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={s.title}>My Academic Dashboard</h1>
          <p style={s.sub}>Roll No: <strong style={{ color: '#60a5fa' }}>{student?.roll_no}</strong> · Semester {student?.semester} · Section {student?.section}</p>
        </div>
        <button onClick={handleDownload} style={s.dlBtn}>⬇ Download My Report (PDF)</button>
      </div>

      {/* Risk Banner */}
      <div style={{ ...s.riskBanner, background: rc.bg, borderColor: rc.border }}>
        <div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: rc.color }}>{rc.label}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>{rc.msg}</p>
          {risk?.reason && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Reason: {risk.reason}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {risk?.att_percent != null && <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: rc.color }}>{risk.att_percent}%</p>}
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Overall Attendance</p>
          {risk?.avg_marks != null && (
            <>
              <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800, color: rc.color }}>{risk.avg_marks}%</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Average Marks</p>
            </>
          )}
        </div>
      </div>

      <div style={s.grid2}>
        {/* Attendance bar chart */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📅 Attendance by Subject</h3>
          {attSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attSummary} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Bar dataKey="pct" name="Attendance %" fill="#3b82f6" radius={[4,4,0,0]}
                  label={{ position: 'top', fill: '#64748b', fontSize: 10, formatter: (v) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#475569', textAlign: 'center', padding: 60 }}>No attendance data yet.</p>}
        </div>

        {/* Marks line chart */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📝 Marks Trend by Subject</h3>
          {marksLineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={marksLineData} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="internal" name="Internal" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="midterm"  name="Midterm"  stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="final"    name="Final"    stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#475569', textAlign: 'center', padding: 60 }}>No marks data yet.</p>}
        </div>
      </div>

      {/* Subject-wise detail */}
      {attSummary.length > 0 && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Subject-wise Attendance Detail</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
            {attSummary.map((a, i) => {
              const pct = a.pct || 0;
              const color = pct < 60 ? '#ef4444' : pct < 75 ? '#f97316' : pct < 85 ? '#eab308' : '#22c55e';
              return (
                <div key={i} style={{ background: '#060f1e', borderRadius: 10, padding: '16px', border: `1px solid ${color}30` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{a.subject}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{a.present}/{a.total} classes</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  page:       { padding: 28, maxWidth: 1400, margin: '0 auto' },
  title:      { margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  sub:        { margin: '6px 0 0', fontSize: 14, color: '#64748b' },
  dlBtn:      { padding: '10px 20px', background: 'linear-gradient(135deg,#065f46,#10b981)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  riskBanner: { border: '2px solid', borderRadius: 14, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  grid2:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 16 },
  card:       { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 16 },
  cardTitle:  { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
};

export default StudentDashboard;
