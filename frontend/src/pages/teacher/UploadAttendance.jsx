/**
 * pages/teacher/UploadAttendance.jsx
 * Manual entry + Excel bulk upload via Bull.js queue
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const UploadAttendance = () => {
  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile]           = useState(null);
  const [form, setForm] = useState({ subject_id: '', date: new Date().toISOString().split('T')[0] });
  const [attendance, setAttendance] = useState({}); // {student_id: 'present'|'absent'}

  useEffect(() => {
    api.get('/teacher/dashboard').then(r => setSubjects(r.data.data.subjects || [])).catch(() => {});
    api.get('/teacher/my-students').then(r => {
      setStudents(r.data.data);
      const init = {};
      r.data.data.forEach(s => { init[s.student_id] = 'present'; });
      setAttendance(init);
    }).catch(() => {});
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject_id) return toast.error('Select a subject');
    setLoading(true);
    let success = 0, failed = 0;
    for (const [student_id, status] of Object.entries(attendance)) {
      try {
        await api.post('/teacher/manual-attendance', { student_id, subject_id: form.subject_id, date: form.date, status });
        success++;
      } catch { failed++; }
    }
    setLoading(false);
    toast.success(`Saved ${success} records${failed ? `, ${failed} failed` : ''}`);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select an Excel file');
    if (!form.subject_id) return toast.error('Select a subject');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject_id', form.subject_id);
    try {
      await api.post('/teacher/upload-attendance', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File queued! You will be notified when processing is complete.');
      setFile(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get('/teacher/download-attendance', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'attendance.xlsx'; a.click();
    } catch { toast.error('Download failed'); }
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.student_id] = status; });
    setAttendance(updated);
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div><h1 style={s.title}>Attendance Management</h1><p style={s.sub}>Manual entry or bulk Excel upload</p></div>
        <button onClick={handleDownload} style={s.dlBtn}>⬇ Export Excel</button>
      </div>

      <div style={s.grid2}>
        {/* Manual Entry */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📅 Manual Attendance Entry</h3>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Subject</label>
                <select style={s.input} value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} required>
                  <option value="">Select Subject</option>
                  {subjects.map(sub => <option key={sub.subject_id} value={sub.subject_id}>{sub.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Mark all:</span>
              <button type="button" style={s.markBtn('#22c55e')} onClick={() => markAll('present')}>✓ All Present</button>
              <button type="button" style={s.markBtn('#ef4444')} onClick={() => markAll('absent')}>✗ All Absent</button>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>Present: <strong style={{ color: '#22c55e' }}>{presentCount}</strong> / {students.length}</span>
            </div>

            <div style={s.studentList}>
              {students.map(st => (
                <div key={st.student_id} style={{ ...s.studentRow, background: attendance[st.student_id] === 'present' ? '#22c55e0a' : '#ef44440a', borderColor: attendance[st.student_id] === 'present' ? '#22c55e30' : '#ef444430' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{st.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{st.roll_no}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['present', 'absent'].map(status => (
                      <button key={status} type="button"
                        onClick={() => setAttendance(p => ({ ...p, [st.student_id]: status }))}
                        style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                          background: attendance[st.student_id] === status ? (status === 'present' ? '#22c55e' : '#ef4444') : '#1e293b',
                          color: attendance[st.student_id] === status ? 'white' : '#64748b',
                        }}
                      >{status === 'present' ? 'P' : 'A'}</button>
                    ))}
                  </div>
                </div>
              ))}
              {students.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: 32 }}>No students assigned to you yet.</p>}
            </div>

            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Saving...' : '💾 Save Attendance'}
            </button>
          </form>
        </div>

        {/* Excel Upload */}
        <div>
          <div style={{ ...s.card, marginBottom: 16 }}>
            <h3 style={s.cardTitle}>📤 Bulk Upload via Excel</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>Upload .xlsx file. Processing is async — you'll get a notification when done.</p>

            <div style={s.excelFormat}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Required Excel Columns:</p>
              <code style={{ fontSize: 12, color: '#60a5fa' }}>roll_no | date (YYYY-MM-DD) | status (present/absent)</code>
            </div>

            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div style={s.field}>
                <label style={s.label}>Subject</label>
                <select style={s.input} value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} required>
                  <option value="">Select Subject</option>
                  {subjects.map(sub => <option key={sub.subject_id} value={sub.subject_id}>{sub.name}</option>)}
                </select>
              </div>

              <div style={s.dropzone} onClick={() => document.getElementById('att-file').click()}>
                <input id="att-file" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <span style={{ fontSize: 32 }}>📂</span>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: file ? '#22c55e' : '#64748b', fontWeight: 600 }}>
                  {file ? file.name : 'Click to select .xlsx / .csv file'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>Max 10MB</p>
              </div>

              <button type="submit" style={{ ...s.btn, background: 'linear-gradient(135deg,#065f46,#10b981)' }} disabled={uploading}>
                {uploading ? 'Queuing...' : '🚀 Upload & Process'}
              </button>
            </form>
          </div>

          {/* Legend */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Attendance Thresholds</h3>
            {[
              { label: 'High Risk',   range: '< 60%',   color: '#ef4444' },
              { label: 'Medium Risk', range: '60 – 74%', color: '#f97316' },
              { label: 'Low Risk',    range: '75 – 84%', color: '#eab308' },
              { label: 'Safe',        range: '≥ 85%',   color: '#22c55e' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</span>
                <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const s = {
  page:       { padding: 28, maxWidth: 1400, margin: '0 auto' },
  title:      { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  sub:        { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  grid2:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 },
  card:       { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24 },
  cardTitle:  { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:      { padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  markBtn:    (c) => ({ padding: '6px 14px', background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 6, color: c, fontSize: 12, fontWeight: 700, cursor: 'pointer' }),
  studentList: { maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' },
  studentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid', transition: 'all 0.15s' },
  btn:        { padding: '12px', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  dlBtn:      { padding: '10px 20px', background: 'linear-gradient(135deg,#065f46,#10b981)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  dropzone:   { border: '2px dashed #334155', borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  excelFormat: { background: '#1e293b', borderRadius: 8, padding: 12 },
};

export default UploadAttendance;
