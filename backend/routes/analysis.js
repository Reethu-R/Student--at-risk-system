/**
 * routes/analysis.js
 * Chart data endpoints + manual risk engine trigger
 */

const express  = require('express');
const router   = express.Router();
const pool     = require('../config/db');
const { cacheGet, cacheSet } = require('../config/redis');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── GET /api/analysis/chart-attendance ───────────────────────
router.get('/chart-attendance', async (req, res) => {
  const { department_id, semester, faculty_id } = req.query;
  const cacheKey = `chart:att:${department_id}:${semester}:${faculty_id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    let query = `
      SELECT sub.name AS subject,
             ROUND(AVG(CASE WHEN a.status='present' THEN 100 ELSE 0 END),2) AS avg_attendance
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.subject_id
      JOIN students s ON a.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) { query += ' AND s.department_id = ?'; params.push(department_id); }
    if (semester)      { query += ' AND s.semester = ?';      params.push(semester); }
    if (faculty_id)    { query += ' AND sub.faculty_id = ?';  params.push(faculty_id); }
    query += ' GROUP BY sub.subject_id ORDER BY sub.name';

    const [rows] = await pool.execute(query, params);
    await cacheSet(cacheKey, rows, 300);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/analysis/chart-marks ────────────────────────────
router.get('/chart-marks', async (req, res) => {
  const { department_id, semester, subject_id } = req.query;
  const cacheKey = `chart:marks:${department_id}:${semester}:${subject_id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    let query = `
      SELECT sub.name AS subject, m.exam_type,
             ROUND(AVG((m.marks_obtained/m.max_marks)*100),2) AS avg_pct
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.subject_id
      JOIN students s ON m.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) { query += ' AND s.department_id = ?'; params.push(department_id); }
    if (semester)      { query += ' AND s.semester = ?';      params.push(semester); }
    if (subject_id)    { query += ' AND m.subject_id = ?';    params.push(subject_id); }
    query += ' GROUP BY sub.subject_id, m.exam_type ORDER BY sub.name, m.exam_type';

    const [rows] = await pool.execute(query, params);
    await cacheSet(cacheKey, rows, 300);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/analysis/chart-riskdist ─────────────────────────
router.get('/chart-riskdist', async (req, res) => {
  const { department_id } = req.query;
  const cacheKey = `chart:risk:${department_id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    let query = `
      SELECT rf.risk_level, COUNT(*) AS count
      FROM risk_flags rf
      JOIN students s ON rf.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) { query += ' AND s.department_id = ?'; params.push(department_id); }
    query += ' GROUP BY rf.risk_level';

    const [rows] = await pool.execute(query, params);
    await cacheSet(cacheKey, rows, 300);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/analysis/risk-engine ────────────────────────────
// Manual trigger (admin only via query param check)
router.get('/risk-engine', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hod') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  try {
    const { runRiskEngine } = require('../jobs/riskEngine');
    runRiskEngine().catch(console.error); // Non-blocking
    return res.json({ success: true, message: 'Risk engine triggered, processing in background...' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
