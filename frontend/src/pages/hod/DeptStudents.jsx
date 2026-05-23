/**
 * pages/hod/DeptStudents.jsx
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RISK = {
  high:   { bg: '#ef444422', color: '#ef4444', label: '🔴 HIGH' },
  medium: { bg: '#f9731622', color: '#f97316', label: '🟠 MED' },
  low:    { bg: '#eab30822', color: '#eab308', label: '🟡 LOW' },
  safe:   { bg: '#22c55e22', color: '#22c55e', label: '🟢 SAFE' },
};

const DeptStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterSem,  setFilterSem]  = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const sem = filterSem ? `&semester=${filterSem}` : '';
    api.get(`/hod/my-students?page=${page}&limit=50${sem}`)
      .then(r => { setStudents(r.data.data); setTotal(r.data.pagination.total); })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [page, filterSem]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q))
      && (!filterRisk || s.risk_level === filterRisk);
  });

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div><h1 style={s.title}>Department Students</h1><p style={s.sub}>{total} students enrolled</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={s.search} placeholder="Search name / roll no..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.sel} value={filterSem}  onChange={e => { setFilterSem(e.target.value); setPage(1); }}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
          </select>
          <select style={s.sel} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="">All Risk</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="safe">Safe</option>
          </select>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div> : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>{['Roll No','Name','Semester','Section','Attendance','Avg Marks','Risk Level'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(st => {
                const rs = RISK[st.risk_level] || RISK.safe;
                return (
                  <tr key={st.student_id} style={s.row}>
                    <td style={s.td}><code style={s.code}>{st.roll_no}</code></td>
                    <td style={{ ...s.td, fontWeight: 600, color: '#e2e8f0' }}>{st.name}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>Sem {st.semester}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{st.section}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ color: (st.att_percent || 100) < 75 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                        {st.att_percent != null ? `${st.att_percent}%` : '—'}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ color: (st.avg_marks || 100) < 50 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                        {st.avg_marks != null ? `${st.avg_marks}%` : '—'}
                      </span>
                    </td>
                    <td style={s.td}><span style={{ ...s.badge, background: rs.bg, color: rs.color }}>{rs.label}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No students found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ color: '#64748b', fontSize: 14, padding: '8px 16px' }}>Page {page} / {Math.ceil(total / 50) || 1}</span>
        <button style={s.pageBtn} disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
};

const s = {
  page: { padding: 28, maxWidth: 1400, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  search: { padding: '9px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 220, outline: 'none' },
  sel: { padding: '9px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e', whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #1e293b30' },
  td: { padding: '12px 14px', fontSize: 13, color: '#cbd5e1' },
  code: { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#60a5fa', fontFamily: 'monospace' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  pageBtn: { padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' },
};

export default DeptStudents;
