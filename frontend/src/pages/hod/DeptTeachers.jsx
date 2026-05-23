/**
 * pages/hod/DeptTeachers.jsx
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DeptTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/hod/my-teachers')
      .then(r => setTeachers(r.data.data))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div><h1 style={s.title}>Department Teachers</h1><p style={s.sub}>{teachers.length} teachers in your department</p></div>
        <input style={s.search} placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div> : (
        <div style={s.grid}>
          {filtered.map(t => (
            <div key={t.faculty_id} style={s.card}>
              <div style={s.avatar}>{t.name?.[0]?.toUpperCase()}</div>
              <h3 style={s.name}>{t.name}</h3>
              <p style={s.email}>{t.email}</p>
              {t.employee_id && <p style={s.empId}>ID: {t.employee_id}</p>}
              <span style={{ ...s.badge, background: t.is_active ? '#22c55e22' : '#ef444422', color: t.is_active ? '#22c55e' : '#ef4444' }}>
                {t.is_active ? '● Active' : '● Inactive'}
              </span>
              {t.subjects_assigned && (
                <div style={s.subjects}>
                  <p style={s.subLabel}>Subjects Assigned:</p>
                  <p style={s.subValue}>{JSON.stringify(t.subjects_assigned)}</p>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#475569', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>No teachers found.</p>}
        </div>
      )}
    </div>
  );
};

const s = {
  page:     { padding: 28, maxWidth: 1400, margin: '0 auto' },
  topBar:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title:    { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub:      { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  search:   { padding: '9px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 260, outline: 'none' },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  card:     { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 },
  avatar:   { width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 },
  name:     { margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  email:    { margin: 0, fontSize: 12, color: '#60a5fa' },
  empId:    { margin: 0, fontSize: 12, color: '#64748b' },
  badge:    { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  subjects: { marginTop: 8, textAlign: 'left', width: '100%' },
  subLabel: { margin: 0, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  subValue: { margin: '4px 0 0', fontSize: 12, color: '#94a3b8' },
};

export default DeptTeachers;
