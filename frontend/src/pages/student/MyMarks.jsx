/**
 * pages/student/MyMarks.jsx
 */
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const EXAM_COLOR = { internal: '#3b82f6', midterm: '#8b5cf6', final: '#22c55e' };

const MyMarks = () => {
  const [marks, setMarks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/my-marks')
      .then(r => setMarks(r.data.data))
      .catch(() => toast.error('Failed to load marks'))
      .finally(() => setLoading(false));
  }, []);

  // Build chart data grouped by subject
  const chartData = marks.reduce((acc, m) => {
    const existing = acc.find(a => a.subject === m.subject?.substring(0, 14));
    if (existing) existing[m.exam_type] = m.pct;
    else acc.push({ subject: m.subject?.substring(0, 14), [m.exam_type]: m.pct });
    return acc;
  }, []);

  // Group by subject for table
  const bySubject = marks.reduce((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = [];
    acc[m.subject].push(m);
    return acc;
  }, {});

  const avgAll = marks.length ? (marks.reduce((s, m) => s + (m.pct || 0), 0) / marks.length).toFixed(1) : null;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={s.title}>My Marks</h1>
          {avgAll && <p style={s.sub}>Overall average: <strong style={{ color: parseFloat(avgAll) >= 60 ? '#22c55e' : '#ef4444', fontSize: 18 }}>{avgAll}%</strong></p>}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading marks...</div> : (
        <>
          {/* Bar chart */}
          {chartData.length > 0 && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>Marks Comparison by Subject</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v, name) => [`${v}%`, name]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                  <Bar dataKey="internal" name="Internal" fill={EXAM_COLOR.internal} radius={[4,4,0,0]} />
                  <Bar dataKey="midterm"  name="Midterm"  fill={EXAM_COLOR.midterm}  radius={[4,4,0,0]} />
                  <Bar dataKey="final"    name="Final"    fill={EXAM_COLOR.final}    radius={[4,4,0,0]} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject tables */}
          {Object.entries(bySubject).map(([subject, entries]) => (
            <div key={subject} style={s.card}>
              <h3 style={s.cardTitle}>{subject}</h3>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Exam Type</th>
                  <th style={s.th}>Marks Obtained</th>
                  <th style={s.th}>Max Marks</th>
                  <th style={s.th}>Percentage</th>
                  <th style={s.th}>Grade</th>
                  <th style={s.th}>Exam Date</th>
                </tr></thead>
                <tbody>
                  {entries.map((m, i) => {
                    const pct   = m.pct || 0;
                    const color = pct < 35 ? '#ef4444' : pct < 50 ? '#f97316' : pct < 60 ? '#eab308' : '#22c55e';
                    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
                    return (
                      <tr key={i} style={s.row}>
                        <td style={s.td}>
                          <span style={{ ...s.examBadge, background: `${EXAM_COLOR[m.exam_type]}22`, color: EXAM_COLOR[m.exam_type] }}>
                            {m.exam_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#f1f5f9' }}>{m.marks_obtained}</td>
                        <td style={s.td}>{m.max_marks}</td>
                        <td style={s.td}><span style={{ color, fontWeight: 700 }}>{pct}%</span></td>
                        <td style={s.td}><span style={{ ...s.gradeBadge, background: `${color}22`, color }}>{grade}</span></td>
                        <td style={s.td}>{m.exam_date ? new Date(m.exam_date).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {marks.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>No marks recorded yet.</div>}
        </>
      )}
    </div>
  );
};

const s = {
  page:      { padding: 28, maxWidth: 1200, margin: '0 auto' },
  title:     { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub:       { margin: '6px 0 0', fontSize: 14, color: '#64748b' },
  card:      { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 16 },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e' },
  row:       { borderBottom: '1px solid #1e293b30' },
  td:        { padding: '12px 14px', fontSize: 13, color: '#cbd5e1' },
  examBadge: { padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  gradeBadge:{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
};

export default MyMarks;
