/**
 * App.jsx
 * Main router — protected routes per role, lazy loading, layout wrapper
 */

import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar  from './components/Navbar';

// Lazy-loaded pages (code splitting for performance)
const Login           = lazy(() => import('./pages/Login'));
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageFaculty   = lazy(() => import('./pages/admin/ManageFaculty'));
const ManageStudents  = lazy(() => import('./pages/admin/ManageStudents'));
const HODDashboard    = lazy(() => import('./pages/hod/HODDashboard'));
const DeptTeachers    = lazy(() => import('./pages/hod/DeptTeachers'));
const DeptStudents    = lazy(() => import('./pages/hod/DeptStudents'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const UploadAttendance = lazy(() => import('./pages/teacher/UploadAttendance'));
const UploadMarks      = lazy(() => import('./pages/teacher/UploadMarks'));
const AtRiskAlerts     = lazy(() => import('./pages/teacher/AtRiskAlerts'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MyAttendance     = lazy(() => import('./pages/student/MyAttendance'));
const MyMarks          = lazy(() => import('./pages/student/MyMarks'));

// ── Loading spinner ───────────────────────────────────────────
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #1e293b', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// ── Protected route — redirects if not authed or wrong role ───
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const redirects = { admin: '/admin/dashboard', hod: '/hod/dashboard', teacher: '/teacher/dashboard', student: '/student/dashboard' };
    return <Navigate to={redirects[user.role] || '/login'} replace />;
  }
  return <Outlet />;
};

// ── Layout with sidebar + navbar ─────────────────────────────
const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060f1e', color: '#e2e8f0', fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #060f1e; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        input, select, textarea { font-family: inherit; }
        a { text-decoration: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// ── App root ─────────────────────────────────────────────────
const AppRoutes = () => {
  const { user } = useAuth();
  const defaultPath = user
    ? `/${user.role}/dashboard`
    : '/login';

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <Suspense fallback={<PageLoader />}>
          <div style={{ fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            <style>{`* { box-sizing:border-box; } body { margin:0; } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
            <Login />
          </div>
        </Suspense>
      } />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard"  element={<AdminDashboard />} />
          <Route path="/admin/faculty"    element={<ManageFaculty />} />
          <Route path="/admin/students"   element={<ManageStudents />} />
          <Route path="/admin/departments" element={<AdminDashboard />} />
          <Route path="/admin/audit"      element={<AuditLogs />} />
          <Route path="/admin/thresholds" element={<ThresholdConfig />} />
        </Route>
      </Route>

      {/* HOD routes */}
      <Route element={<ProtectedRoute allowedRoles={['hod']} />}>
        <Route element={<AppLayout />}>
          <Route path="/hod/dashboard"   element={<HODDashboard />} />
          <Route path="/hod/teachers"    element={<DeptTeachers />} />
          <Route path="/hod/students"    element={<DeptStudents />} />
          <Route path="/hod/attendance"  element={<DeptAttendance />} />
          <Route path="/hod/marks"       element={<DeptMarks />} />
          <Route path="/hod/atrisk"      element={<DeptAtRisk />} />
        </Route>
      </Route>

      {/* Teacher routes */}
      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/dashboard"  element={<TeacherDashboard />} />
          <Route path="/teacher/students"   element={<TeacherStudents />} />
          <Route path="/teacher/attendance" element={<UploadAttendance />} />
          <Route path="/teacher/marks"      element={<UploadMarks />} />
          <Route path="/teacher/alerts"     element={<AtRiskAlerts />} />
        </Route>
      </Route>

      {/* Student routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<AppLayout />}>
          <Route path="/student/dashboard"  element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendance />} />
          <Route path="/student/marks"      element={<MyMarks />} />
          <Route path="/student/risk"       element={<MyRiskStatus />} />
          <Route path="/student/alerts"     element={<MyAlerts />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
};

// ── Inline simple pages (avoid extra files for small views) ───
const AuditLogs = () => {
  const [logs, setLogs] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const { api } = useAuth();
  React.useEffect(() => {
    api.get(`/admin/audit-logs?page=${page}`).then(r => { setLogs(r.data.data); setTotal(r.data.pagination.total); }).catch(() => {});
  }, [page]);
  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Audit Logs</h1>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Time','User','Role','Action','IP'].map(h => <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #1e293b', background: '#060f1e' }}>{h}</th>)}</tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b30' }}>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#64748b' }}>{new Date(l.timestamp).toLocaleString()}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{l.name}</td>
                <td style={{ padding: '11px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#1e293b', color: '#94a3b8' }}>{l.role}</span></td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#60a5fa' }}>{l.action}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{l.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
        <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>← Prev</button>
        <span style={{ color: '#64748b', padding: '8px 16px', fontSize: 14 }}>Page {page} / {Math.ceil(total/50)||1}</span>
        <button disabled={page>=Math.ceil(total/50)} onClick={() => setPage(p=>p+1)} style={{ padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>Next →</button>
      </div>
    </div>
  );
};

const ThresholdConfig = () => {
  const { api } = useAuth();
  const [t, setT] = React.useState({ high_att: 60, medium_att: 75, low_att: 85, high_marks: 35, medium_marks: 50, low_marks: 60 });
  const [saved, setSaved] = React.useState(false);
  const handleSave = async (e) => { e.preventDefault(); try { await api.put('/admin/risk-thresholds', t); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch {} };
  const inp = { padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%' };
  return (
    <div style={{ padding: 28, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Risk Thresholds</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>Configure at-risk detection cutoffs. Changes apply on next risk engine run.</p>
      <form onSubmit={handleSave} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Attendance Thresholds (%)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[['high_att','🔴 High Risk Below'],['medium_att','🟠 Medium Below'],['low_att','🟡 Low Below']].map(([k,label]) => (
            <div key={k}><label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
            <input style={inp} type="number" min="0" max="100" value={t[k]} onChange={e => setT(p => ({ ...p, [k]: parseFloat(e.target.value) }))} /></div>
          ))}
        </div>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Marks Thresholds (%)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[['high_marks','🔴 High Risk Below'],['medium_marks','🟠 Medium Below'],['low_marks','🟡 Low Below']].map(([k,label]) => (
            <div key={k}><label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
            <input style={inp} type="number" min="0" max="100" value={t[k]} onChange={e => setT(p => ({ ...p, [k]: parseFloat(e.target.value) }))} /></div>
          ))}
        </div>
        <button type="submit" style={{ padding: 13, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {saved ? '✅ Thresholds Saved!' : '💾 Save Thresholds'}
        </button>
      </form>
    </div>
  );
};

const DeptAttendance = () => {
  const { api } = useAuth();
  const [data, setData] = React.useState([]);
  React.useEffect(() => { api.get('/hod/dept-attendance').then(r => setData(r.data.data)).catch(() => {}); }, []);
  return <SimpleTable title="Department Attendance" rows={data} cols={['student_name','roll_no','semester','subject_name','total','present','pct']} headers={['Name','Roll No','Sem','Subject','Total','Present','%']} />;
};

const DeptMarks = () => {
  const { api } = useAuth();
  const [data, setData] = React.useState([]);
  React.useEffect(() => { api.get('/hod/dept-marks').then(r => setData(r.data.data)).catch(() => {}); }, []);
  return <SimpleTable title="Department Marks" rows={data} cols={['student_name','roll_no','semester','subject_name','exam_type','marks_obtained','max_marks','pct']} headers={['Name','Roll No','Sem','Subject','Exam','Marks','Max','%']} />;
};

const DeptAtRisk = () => {
  const { api } = useAuth();
  const [data, setData] = React.useState([]);
  React.useEffect(() => { api.get('/hod/dept-atrisk').then(r => setData(r.data.data)).catch(() => {}); }, []);
  const RISK_COLOR = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };
  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>At-Risk Students ({data.length})</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((s, i) => (
          <div key={i} style={{ background: '#0f172a', border: `1px solid ${RISK_COLOR[s.risk_level]}40`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{s.student_name}</span>
              <code style={{ marginLeft: 10, fontSize: 12, background: '#1e293b', padding: '2px 8px', borderRadius: 4, color: '#60a5fa' }}>{s.roll_no}</code>
              <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>Sem {s.semester} · {s.section}</span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>{s.reason}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${RISK_COLOR[s.risk_level]}22`, color: RISK_COLOR[s.risk_level] }}>{s.risk_level?.toUpperCase()} RISK</span>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>Att: {s.att_percent ?? '—'}% | Marks: {s.avg_marks ?? '—'}%</p>
            </div>
          </div>
        ))}
        {data.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: '#22c55e', fontSize: 18, fontWeight: 700 }}>✅ No at-risk students in your department!</div>}
      </div>
    </div>
  );
};

const TeacherStudents = () => {
  const { api } = useAuth();
  const [data, setData] = React.useState([]);
  React.useEffect(() => { api.get('/teacher/my-students').then(r => setData(r.data.data)).catch(() => {}); }, []);
  return <SimpleTable title={`My Students (${data.length})`} rows={data} cols={['roll_no','name','semester','section','att_percent','avg_marks','risk_level']} headers={['Roll No','Name','Sem','Section','Attendance','Avg Marks','Risk']} />;
};

const MyRiskStatus = () => {
  const { api } = useAuth();
  const [risk, setRisk] = React.useState(null);
  React.useEffect(() => { api.get('/student/my-risk-status').then(r => setRisk(r.data.data)).catch(() => {}); }, []);
  const RISK_CONFIG = {
    high: { color: '#ef4444', bg: '#ef444418', border: '#ef4444', icon: '🔴', label: 'HIGH RISK' },
    medium: { color: '#f97316', bg: '#f9731618', border: '#f97316', icon: '🟠', label: 'MEDIUM RISK' },
    low: { color: '#eab308', bg: '#eab30818', border: '#eab308', icon: '🟡', label: 'LOW RISK' },
    safe: { color: '#22c55e', bg: '#22c55e18', border: '#22c55e', icon: '🟢', label: 'SAFE' },
  };
  const rc = RISK_CONFIG[risk?.risk_level] || RISK_CONFIG.safe;
  return (
    <div style={{ padding: 28, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>My Risk Status</h1>
      {risk && (
        <div style={{ background: rc.bg, border: `2px solid ${rc.border}`, borderRadius: 16, padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{rc.icon}</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: rc.color }}>{rc.label}</h2>
          {risk.reason && <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{risk.reason}</p>}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {risk.att_percent != null && <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 24px' }}><p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: rc.color }}>{risk.att_percent}%</p><p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Attendance</p></div>}
            {risk.avg_marks   != null && <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 24px' }}><p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: rc.color }}>{risk.avg_marks}%</p><p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Avg Marks</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};

const MyAlerts = () => {
  const { api } = useAuth();
  const [alerts, setAlerts] = React.useState([]);
  React.useEffect(() => { api.get('/student/my-alerts').then(r => setAlerts(r.data.data)).catch(() => {}); }, []);
  return (
    <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>My Alerts ({alerts.length})</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>{a.message}</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569' }}>{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
        {alerts.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: '#22c55e', fontSize: 18, fontWeight: 700 }}>✅ No alerts! You're doing great.</div>}
      </div>
    </div>
  );
};

const SimpleTable = ({ title, rows, cols, headers }) => (
  <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
    <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{title}</h1>
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{headers.map(h => <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b', background: '#060f1e', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1e293b30' }}>
              {cols.map(c => <td key={c} style={{ padding: '11px 14px', fontSize: 13, color: '#cbd5e1' }}>{r[c] ?? '—'}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No data found.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Root export ───────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '10px' },
        }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
