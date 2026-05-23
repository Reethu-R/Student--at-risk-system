/**
 * pages/admin/ManageStudents.jsx
 * Admin: view all students with risk status, create, deactivate
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_STYLES = {
  high:   { bg: '#ef444422', color: '#ef4444', label: '🔴 HIGH' },
  medium: { bg: '#f9731622', color: '#f97316', label: '🟠 MEDIUM' },
  low:    { bg: '#eab30822', color: '#eab308', label: '🟡 LOW' },
  safe:   { bg: '#22c55e22', color: '#22c55e', label: '🟢 SAFE' },
};

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [depts, setDepts]       = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department_id: '', roll_no: '', semester: 1, batch_year: new Date().getFullYear(), section: 'A' });

  const fetchStudents = () => {
    setLoading(true);
    api.get(`/admin/all-students?page=${page}&limit=50`)
      .then(r => { setStudents(r.data.data); setTotal(r.data.pagination.total); })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, [page]);
  useEffect(() => { api.get('/admin/all-departments').then(r => setDepts(r.data.data)).catch(() => {}); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/create-user', form);
      toast.success('Student created!');
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Creation failed');
    }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try { await api.put(`/admin/deactivate-user/${userId}`); toast.success('Deactivated'); fetchStudents(); }
    catch { toast.error('Failed'); }
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchRisk   = !filterRisk || s.risk_level === filterRisk;
    return matchSearch && matchRisk;
  });

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.title}>Student Management</h1>
          <p style={s.sub}>{total} total students enrolled</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={s.search} placeholder="Search name, roll no, email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.select} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="safe">Safe</option>
          </select>
          <button style={s.btn} onClick={() => setShowModal(true)}>+ Add Student</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div> : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>{['Roll No','Name','Department','Semester','Batch','Attendance','Avg Marks','Risk','Status','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(st => {
                const rs = RISK_STYLES[st.risk_level] || RISK_STYLES.safe;
                return (
                  <tr key={st.student_id} style={s.row}>
                    <td style={s.td}><code style={s.code}>{st.roll_no}</code></td>
                    <td style={{ ...s.td, fontWeight: 600, color: '#e2e8f0' }}>{st.name}</td>
                    <td style={s.td}><span style={s.deptBadge}>{st.dept_code}</span></td>
                    <td style={{ ...s.td, textAlign: 'center' }}>Sem {st.semester}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{st.batch_year}</td>
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
                    <td style={s.td}><span style={{ ...s.badge, background: st.is_active ? '#22c55e22' : '#ef444422', color: st.is_active ? '#22c55e' : '#ef4444' }}>{st.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={s.td}>
                      {st.is_active && <button style={s.dangerBtn} onClick={() => handleDeactivate(st.user_id, st.name)}>Deactivate</button>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No students found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ color: '#64748b', fontSize: 14, padding: '8px 16px' }}>Page {page} / {Math.ceil(total / 50) || 1}</span>
        <button style={s.pageBtn} disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Enroll New Student</h2>
            <form onSubmit={handleCreate} style={s.form}>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Student Full Name' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'student@college.edu' },
                { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Roll Number', key: 'roll_no', type: 'text', placeholder: 'CSE2024001' },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input style={s.input} type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Semester</label>
                  <select style={s.input} value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Section</label>
                  <select style={s.input} value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))}>
                    {['A','B','C','D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Department</label>
                <select style={s.input} value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))} required>
                  <option value="">Select Department</option>
                  {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Batch Year</label>
                <input style={s.input} type="number" min="2020" max="2030" value={form.batch_year} onChange={e => setForm(p => ({ ...p, batch_year: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.btn}>Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  page: { padding: 28, maxWidth: 1600, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  search: { padding: '9px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 260, outline: 'none' },
  select: { padding: '9px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' },
  btn: { padding: '9px 20px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e', whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #1e293b40' },
  td: { padding: '12px 14px', fontSize: 13, color: '#cbd5e1' },
  code: { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#60a5fa', fontFamily: 'monospace' },
  deptBadge: { background: '#1e40af22', color: '#60a5fa', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  dangerBtn: { padding: '5px 12px', background: '#ef444415', border: '1px solid #ef444440', borderRadius: 6, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  pageBtn: { padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 36, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  cancelBtn: { flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
};

export default ManageStudents;
