/**
 * pages/student/MyAttendance.jsx
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MyAttendance = () => {
  const [data, setData]       = useState({ records: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [filterSub, setFilterSub] = useState('');

  useEffect(() => {
    api.get('/student/my-attendance')
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  const subjects = [...new Set(data.records.map(r => r.subject))];
  const filtered = filterSub ? data.records.filter(r => r.subject === filterSub) : data.records;

  return (
    <div style={s.page}>
      <h1 style={s.title}>My Attendance</h1>

      {/* Summary cards */}
      <div style={s.summaryGrid}>
        {data.summary.map((sub, i) => {
          const pct   = sub.pct || 0;
          const color = pct < 60 ? '#ef4444' : pct < 75 ? '#f97316' : pct < 85 ? '#eab308' : '#22c55e';
          return (
            <div key={i} style={{ ...s.summaryCard, borderColor: `${color}40` }}>
              <p style={s.subName}>{sub.subject}</p>
              <p style={{ ...s.pct, color }}>{pct}%</p>
              <p style={s.classes}>{sub.present} / {sub.total} classes</p>
              <div style={s.bar}><div style={{ ...s.barFill, width: `${Math.min(pct,100)}%`, background: color }} /></div>
              {pct < 75 && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⚠️ Below minimum (75%)</p>}
            </div>
          );
        })}
      </div>

      {/* Filter + table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Detailed Records ({filtered.length})</h2>
        <select style={s.sel} value={filterSub} onChange={e => setFilterSub(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
        </select>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div> : (
        <div style={s.card}>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Subject</th>
              <th style={s.th}>Subject Code</th>
              <th style={s.th}>Status</th>
            </tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} style={s.row}>
                  <td style={s.td}>{new Date(r.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                  <td style={{ ...s.td, fontWeight: 600, color: '#e2e8f0' }}>{r.subject}</td>
                  <td style={s.td}><code style={s.code}>{r.subject_code}</code></td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, background: r.status === 'present' ? '#22c55e22' : '#ef444422', color: r.status === 'present' ? '#22c55e' : '#ef4444' }}>
                      {r.status === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No records found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const s = {
  page:        { padding: 28, maxWidth: 1200, margin: '0 auto' },
  title:       { margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14, marginBottom: 28 },
  summaryCard: { background: '#0f172a', border: '1px solid', borderRadius: 12, padding: 18 },
  subName:     { margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  pct:         { margin: 0, fontSize: 32, fontWeight: 800 },
  classes:     { margin: '4px 0 10px', fontSize: 12, color: '#64748b' },
  bar:         { height: 6, background: '#1e293b', borderRadius: 3 },
  barFill:     { height: '100%', borderRadius: 3, transition: 'width 0.5s' },
  sel:         { padding: '9px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' },
  card:        { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e' },
  row:         { borderBottom: '1px solid #1e293b30' },
  td:          { padding: '12px 16px', fontSize: 13, color: '#cbd5e1' },
  code:        { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#60a5fa', fontFamily: 'monospace' },
  statusBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
};

export default MyAttendance;
