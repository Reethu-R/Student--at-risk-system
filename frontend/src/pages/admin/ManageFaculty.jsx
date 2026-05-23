/**
 * pages/admin/ManageFaculty.jsx
 * Admin: view all faculty, create new, deactivate
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_COLOR = { hod: '#8b5cf6', teacher: '#10b981' };

const ManageFaculty = () => {
  const [faculty, setFaculty]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [depts, setDepts]       = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'teacher',
    department_id: '', employee_id: ''
  });

  const fetchFaculty = () => {
    setLoading(true);
    api.get(`/admin/all-faculty?page=${page}&limit=50`)
      .then(r => { setFaculty(r.data.data); setTotal(r.data.pagination.total); })
      .catch(() => toast.error('Failed to load faculty'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFaculty(); }, [page]);
  useEffect(() => {
    api.get('/admin/all-departments').then(r => setDepts(r.data.data)).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/create-user', form);
      toast.success('Faculty created successfully!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'teacher', department_id: '', employee_id: '' });
      fetchFaculty();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Creation failed');
    }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await api.put(`/admin/deactivate-user/${userId}`);
      toast.success('User deactivated');
      fetchFaculty();
    } catch { toast.error('Failed to deactivate'); }
  };

  const filtered = faculty.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    f.department_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.title}>Faculty Management</h1>
          <p style={s.sub}>{total} total faculty members</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input style={s.search} placeholder="Search by name, email, dept..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.btn} onClick={() => setShowModal(true)}>+ Add Faculty</button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>{['Name','Email','Role','Department','Employee ID','Status','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.faculty_id} style={s.row}>
                  <td style={s.td}><span style={s.name}>{f.name}</span></td>
                  <td style={s.td}><span style={s.email}>{f.email}</span></td>
                  <td style={s.td}><span style={{ ...s.badge, background: `${ROLE_COLOR[f.faculty_type]}22`, color: ROLE_COLOR[f.faculty_type] }}>{f.faculty_type?.toUpperCase()}</span></td>
                  <td style={s.td}>{f.department_name}</td>
                  <td style={s.td}><code style={s.code}>{f.employee_id || '—'}</code></td>
                  <td style={s.td}><span style={{ ...s.badge, background: f.is_active ? '#22c55e22' : '#ef444422', color: f.is_active ? '#22c55e' : '#ef4444' }}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={s.td}>
                    {f.is_active && <button style={s.dangerBtn} onClick={() => handleDeactivate(f.user_id, f.name)}>Deactivate</button>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No faculty found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ color: '#64748b', fontSize: 14, padding: '8px 16px' }}>Page {page} of {Math.ceil(total/50) || 1}</span>
        <button style={s.pageBtn} disabled={page >= Math.ceil(total/50)} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Add New Faculty</h2>
            <form onSubmit={handleCreate} style={s.form}>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Smith' },
                { label: 'Email (@pestrust.edu.in)', key: 'email', type: 'email', placeholder: 'j.smith@pestrust.edu.in' },
                { label: 'Password (min 8 chars)', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Employee ID', key: 'employee_id', type: 'text', placeholder: 'EMP001' },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input style={s.input} type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required={f.key !== 'employee_id'} />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Role</label>
                <select style={s.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="teacher">Teacher</option>
                  <option value="hod">HOD</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Department</label>
                <select style={s.input} value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))} required>
                  <option value="">Select Department</option>
                  {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={s.btn}>Create Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Loader = () => <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading faculty data...</div>;

const s = {
  page: { padding: 28, maxWidth: 1400, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub:   { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  search: { padding: '9px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 280, outline: 'none' },
  btn: { padding: '9px 20px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e' },
  row: { borderBottom: '1px solid #0f172a' },
  td: { padding: '13px 16px', fontSize: 14, color: '#cbd5e1' },
  name: { fontWeight: 600, color: '#e2e8f0' },
  email: { color: '#60a5fa', fontSize: 13 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  code: { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#94a3b8' },
  dangerBtn: { padding: '5px 12px', background: '#ef444415', border: '1px solid #ef444440', borderRadius: 6, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  pageBtn: { padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 36, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  cancelBtn: { flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
};

export default ManageFaculty;
