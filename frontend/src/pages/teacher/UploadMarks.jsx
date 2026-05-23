/**
 * pages/teacher/UploadMarks.jsx
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const UploadMarks = () => {
  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ subject_id: '', exam_type: 'internal', max_marks: 100, exam_date: new Date().toISOString().split('T')[0] });
  const [marks, setMarks] = useState({}); // {student_id: marks_obtained}

  useEffect(() => {
    api.get('/teacher/dashboard').then(r => setSubjects(r.data.data.subjects || [])).catch(() => {});
    api.get('/teacher/my-students').then(r => {
      setStudents(r.data.data);
      const init = {};
      r.data.data.forEach(s => { init[s.student_id] = ''; });
      setMarks(init);
    }).catch(() => {});
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject_id) return toast.error('Select a subject');
    setSaving(true);
    let success = 0, failed = 0;
    for (const [student_id, marks_obtained] of Object.entries(marks)) {
      if (marks_obtained === '' || marks_obtained === null) continue;
      try {
        await api.post('/teacher/manual-marks', {
          student_id, subject_id: form.subject_id,
          exam_type: form.exam_type, marks_obtained: parseFloat(marks_obtained),
          max_marks: parseFloat(form.max_marks), exam_date: form.exam_date
        });
        success++;
      } catch { failed++; }
    }
    setSaving(false);
    toast.success(`Saved ${success} marks${failed ? `, ${failed} failed` : ''}`);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file');
    if (!form.subject_id) return toast.error('Select a subject');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject_id', form.subject_id);
    fd.append('exam_type', form.exam_type);
    try {
      await api.post('/teacher/upload-marks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Marks upload queued! You\'ll be notified when done.');
      setFile(null);
    } catch (err) { toast.error(err?.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>Marks Entry</h1>
      <p style={s.sub}>Enter marks manually or upload Excel file for bulk entry</p>

      <div style={s.grid2}>
        {/* Manual */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📝 Manual Marks Entry</h3>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Subject</label>
                <select style={s.input} value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} required>
                  <option value="">Select Subject</option>
                  {subjects.map(sub => <option key={sub.subject_id} value={sub.subject_id}>{sub.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Exam Type</label>
                <select style={s.input} value={form.exam_type} onChange={e => setForm(p => ({ ...p, exam_type: e.target.value }))}>
                  <option value="internal">Internal</option>
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Max Marks</label>
                <input style={s.input} type="number" min="1" max="500" value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Exam Date</label>
                <input style={s.input} type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))} />
              </div>
            </div>

            <div style={s.marksTable}>
              <div style={s.marksHeader}>
                <span>Student</span><span>Roll No</span><span>Marks / {form.max_marks}</span>
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {students.map(st => (
                  <div key={st.student_id} style={s.marksRow}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{st.name}</span>
                    <code style={s.code}>{st.roll_no}</code>
                    <input
                      type="number" min="0" max={form.max_marks} step="0.5"
                      placeholder="—"
                      value={marks[st.student_id] ?? ''}
                      onChange={e => setMarks(p => ({ ...p, [st.student_id]: e.target.value }))}
                      style={{ ...s.markInput, borderColor: marks[st.student_id] !== '' && parseFloat(marks[st.student_id]) < parseFloat(form.max_marks) * 0.35 ? '#ef444460' : '#334155' }}
                    />
                  </div>
                ))}
                {students.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No students found.</p>}
              </div>
            </div>

            <button type="submit" style={s.btn} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save All Marks'}
            </button>
          </form>
        </div>

        {/* Excel Upload */}
        <div>
          <div style={{ ...s.card, marginBottom: 16 }}>
            <h3 style={s.cardTitle}>📤 Bulk Upload via Excel</h3>
            <div style={s.excelFormat}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Required Excel Columns:</p>
              <code style={{ fontSize: 12, color: '#60a5fa' }}>roll_no | marks_obtained | max_marks</code>
            </div>
            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Subject</label>
                  <select style={s.input} value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} required>
                    <option value="">Select Subject</option>
                    {subjects.map(sub => <option key={sub.subject_id} value={sub.subject_id}>{sub.name}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Exam Type</label>
                  <select style={s.input} value={form.exam_type} onChange={e => setForm(p => ({ ...p, exam_type: e.target.value }))}>
                    <option value="internal">Internal</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                  </select>
                </div>
              </div>
              <div style={s.dropzone} onClick={() => document.getElementById('marks-file').click()}>
                <input id="marks-file" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <span style={{ fontSize: 32 }}>📂</span>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: file ? '#22c55e' : '#64748b', fontWeight: 600 }}>
                  {file ? file.name : 'Click to select .xlsx / .csv'}
                </p>
              </div>
              <button type="submit" style={{ ...s.btn, background: 'linear-gradient(135deg,#065f46,#10b981)' }} disabled={uploading}>
                {uploading ? 'Queuing...' : '🚀 Upload & Process'}
              </button>
            </form>
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>Marks Thresholds</h3>
            {[
              { label: 'High Risk',   range: '< 35%',   color: '#ef4444' },
              { label: 'Medium Risk', range: '35 – 49%', color: '#f97316' },
              { label: 'Low Risk',    range: '50 – 59%', color: '#eab308' },
              { label: 'Safe',        range: '≥ 60%',   color: '#22c55e' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #1e293b' }}>
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
  sub:        { margin: '4px 0 24px', fontSize: 13, color: '#64748b' },
  grid2:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 },
  card:       { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24 },
  cardTitle:  { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:      { padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none' },
  marksTable: { border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' },
  marksHeader:{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 12, padding: '10px 14px', background: '#060f1e', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  marksRow:   { display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 12, padding: '10px 14px', borderBottom: '1px solid #1e293b20', alignItems: 'center' },
  code:       { background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#60a5fa', fontFamily: 'monospace' },
  markInput:  { padding: '7px 10px', background: '#1e293b', border: '1px solid', borderRadius: 6, color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn:        { padding: 12, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  dropzone:   { border: '2px dashed #334155', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer' },
  excelFormat:{ background: '#1e293b', borderRadius: 8, padding: 12 },
};

export default UploadMarks;
