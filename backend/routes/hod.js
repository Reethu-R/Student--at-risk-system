/**
 * routes/hod.js
 * HOD endpoints — department-scoped access only
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { cacheGet, cacheSet } = require('../config/redis');
const { isHOD } = require('../middleware/roleCheck');
const PDFDocument = require('pdfkit');

router.use(isHOD);

// ── GET /api/hod/dashboard ───────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const deptId   = req.user.department_id;
  const cacheKey = `hod:dashboard:${deptId}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  try {
    const [[stats]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE department_id = ?) AS total_students,
        (SELECT COUNT(*) FROM faculty WHERE department_id = ?) AS total_faculty,
        (SELECT COUNT(*) FROM risk_flags rf
          JOIN students s ON rf.student_id = s.student_id
          WHERE s.department_id = ? AND rf.risk_level = 'high') AS high_risk,
        (SELECT COUNT(*) FROM risk_flags rf
          JOIN students s ON rf.student_id = s.student_id
          WHERE s.department_id = ? AND rf.risk_level = 'medium') AS medium_risk
    `, [deptId, deptId, deptId, deptId]);

    const [riskBySemester] = await pool.execute(`
      SELECT s.semester,
             COUNT(CASE WHEN rf.risk_level = 'high'   THEN 1 END) AS high_risk,
             COUNT(CASE WHEN rf.risk_level = 'medium' THEN 1 END) AS medium_risk,
             COUNT(CASE WHEN rf.risk_level = 'low'    THEN 1 END) AS low_risk,
             COUNT(CASE WHEN rf.risk_level = 'safe'   THEN 1 END) AS safe
      FROM students s
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      WHERE s.department_id = ?
      GROUP BY s.semester
      ORDER BY s.semester
    `, [deptId]);

    const data = { stats, riskBySemester };
    await cacheSet(cacheKey, data, 300);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/my-teachers ─────────────────────────────────
router.get('/my-teachers', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT f.faculty_id, f.faculty_type, f.employee_id, f.subjects_assigned,
             u.user_id, u.name, u.email, u.is_active
      FROM faculty f
      JOIN users u ON f.user_id = u.user_id
      WHERE f.department_id = ? AND f.faculty_type = 'teacher'
      ORDER BY u.name
    `, [req.user.department_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/my-students ─────────────────────────────────
router.get('/my-students', async (req, res) => {
  const page   = parseInt(req.query.page) || 1;
  const limit  = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const sem    = req.query.semester;

  try {
    let query = `
      SELECT s.student_id, s.roll_no, s.semester, s.batch_year, s.section,
             u.name, u.email, u.is_active,
             rf.risk_level, rf.att_percent, rf.avg_marks
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      WHERE s.department_id = ?
    `;
    const params = [req.user.department_id];
    if (sem) { query += ' AND s.semester = ?'; params.push(sem); }
    query += ' ORDER BY s.semester, s.roll_no LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM students WHERE department_id = ?',
      [req.user.department_id]
    );
    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/dept-attendance ─────────────────────────────
router.get('/dept-attendance', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.roll_no, u.name AS student_name, s.semester,
             sub.name AS subject_name,
             COUNT(a.attendance_id) AS total,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
             ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(a.attendance_id)*100,2) AS pct
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      JOIN attendance a ON s.student_id = a.student_id
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE s.department_id = ?
      GROUP BY s.student_id, sub.subject_id
      ORDER BY s.semester, s.roll_no, sub.name
    `, [req.user.department_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/dept-marks ──────────────────────────────────
router.get('/dept-marks', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.roll_no, u.name AS student_name, s.semester,
             sub.name AS subject_name, m.exam_type,
             m.marks_obtained, m.max_marks,
             ROUND((m.marks_obtained/m.max_marks)*100,2) AS pct
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      JOIN marks m ON s.student_id = m.student_id
      JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE s.department_id = ?
      ORDER BY s.semester, s.roll_no, sub.name, m.exam_type
    `, [req.user.department_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/dept-atrisk ─────────────────────────────────
router.get('/dept-atrisk', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.student_id, s.roll_no, s.semester, s.section,
             u.name AS student_name, u.email,
             rf.risk_level, rf.reason, rf.att_percent, rf.avg_marks, rf.flagged_at
      FROM risk_flags rf
      JOIN students s ON rf.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE s.department_id = ? AND rf.risk_level != 'safe'
      ORDER BY FIELD(rf.risk_level,'high','medium','low'), s.semester
    `, [req.user.department_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/hod/download-report ─────────────────────────────
router.get('/download-report', async (req, res) => {
  try {
    const [students] = await pool.execute(`
      SELECT s.roll_no, u.name, s.semester, rf.risk_level, rf.att_percent, rf.avg_marks
      FROM students s JOIN users u ON s.user_id = u.user_id
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      WHERE s.department_id = ? ORDER BY rf.risk_level, s.roll_no
    `, [req.user.department_id]);

    const [[dept]] = await pool.execute(
      'SELECT name FROM departments WHERE department_id = ?',
      [req.user.department_id]
    );

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dept-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(`${dept.name} — At-Risk Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    students.forEach(s => {
      doc.fontSize(11).text(
        `${s.roll_no} | ${s.name} | Sem ${s.semester} | Risk: ${s.risk_level?.toUpperCase() || 'N/A'} | Att: ${s.att_percent || '--'}% | Marks: ${s.avg_marks || '--'}%`
      );
    });

    doc.end();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
