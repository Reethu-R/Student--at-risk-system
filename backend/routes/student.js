/**
 * routes/student.js
 * Student endpoints — strictly own data only
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { isStudent } = require('../middleware/roleCheck');
const PDFDocument = require('pdfkit');

router.use(isStudent);

// ── GET /api/student/dashboard ───────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      'SELECT * FROM students WHERE user_id = ?',
      [req.user.user_id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [[risk]] = await pool.execute(
      'SELECT * FROM risk_flags WHERE student_id = ?',
      [student.student_id]
    );

    const [attSummary] = await pool.execute(`
      SELECT sub.name AS subject,
             COUNT(*) AS total,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
             ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*)*100,2) AS pct
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.student_id = ?
      GROUP BY sub.subject_id
    `, [student.student_id]);

    const [marksSummary] = await pool.execute(`
      SELECT sub.name AS subject, m.exam_type,
             m.marks_obtained, m.max_marks,
             ROUND((m.marks_obtained/m.max_marks)*100,2) AS pct
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE m.student_id = ?
      ORDER BY sub.name, m.exam_type
    `, [student.student_id]);

    return res.json({
      success: true,
      data: { student, risk: risk || { risk_level: 'safe' }, attSummary, marksSummary },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/student/my-attendance ───────────────────────────
router.get('/my-attendance', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      'SELECT student_id FROM students WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT sub.name AS subject, sub.subject_code, a.date, a.status
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, sub.name
    `, [student.student_id]);

    // Aggregate per subject
    const [summary] = await pool.execute(`
      SELECT sub.name AS subject,
             COUNT(*) AS total,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
             ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*)*100,2) AS pct
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.student_id = ?
      GROUP BY sub.subject_id
    `, [student.student_id]);

    return res.json({ success: true, data: { records: rows, summary } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/student/my-marks ────────────────────────────────
router.get('/my-marks', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      'SELECT student_id FROM students WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT sub.name AS subject, sub.subject_code, m.exam_type,
             m.marks_obtained, m.max_marks,
             ROUND((m.marks_obtained/m.max_marks)*100,2) AS pct,
             m.exam_date
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE m.student_id = ?
      ORDER BY sub.name, m.exam_type
    `, [student.student_id]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/student/my-risk-status ─────────────────────────
router.get('/my-risk-status', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      'SELECT student_id FROM students WHERE user_id = ?',
      [req.user.user_id]
    );
    const [[risk]] = await pool.execute(
      'SELECT * FROM risk_flags WHERE student_id = ?',
      [student.student_id]
    );
    return res.json({ success: true, data: risk || { risk_level: 'safe', reason: 'No data yet' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/student/my-alerts ───────────────────────────────
router.get('/my-alerts', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      'SELECT student_id FROM students WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT al.message, al.alert_type, al.created_at
      FROM alerts al
      WHERE al.student_id = ?
      ORDER BY al.created_at DESC
      LIMIT 50
    `, [student.student_id]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/student/download-report ─────────────────────────
router.get('/download-report', async (req, res) => {
  try {
    const [[student]] = await pool.execute(
      `SELECT s.*, u.name, u.email, d.name AS dept_name
       FROM students s JOIN users u ON s.user_id = u.user_id
       JOIN departments d ON s.department_id = d.department_id
       WHERE s.user_id = ?`,
      [req.user.user_id]
    );

    const [[risk]] = await pool.execute(
      'SELECT * FROM risk_flags WHERE student_id = ?',
      [student.student_id]
    );

    const [attendance] = await pool.execute(`
      SELECT sub.name AS subject,
             COUNT(*) AS total,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
             ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*)*100,2) AS pct
      FROM attendance a JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.student_id = ? GROUP BY sub.subject_id
    `, [student.student_id]);

    const [marks] = await pool.execute(`
      SELECT sub.name AS subject, m.exam_type, m.marks_obtained, m.max_marks,
             ROUND((m.marks_obtained/m.max_marks)*100,2) AS pct
      FROM marks m JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE m.student_id = ?
    `, [student.student_id]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${student.roll_no}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Student Academic Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(13)
      .text(`Name: ${student.name}`)
      .text(`Roll No: ${student.roll_no}`)
      .text(`Department: ${student.dept_name}`)
      .text(`Semester: ${student.semester}`)
      .text(`Risk Level: ${risk?.risk_level?.toUpperCase() || 'SAFE'}`);
    doc.moveDown();

    // Attendance
    doc.fontSize(15).text('Attendance Summary');
    doc.moveDown(0.5);
    attendance.forEach(a => {
      doc.fontSize(11).text(`${a.subject}: ${a.present}/${a.total} (${a.pct}%)`);
    });
    doc.moveDown();

    // Marks
    doc.fontSize(15).text('Marks Summary');
    doc.moveDown(0.5);
    marks.forEach(m => {
      doc.fontSize(11).text(
        `${m.subject} | ${m.exam_type}: ${m.marks_obtained}/${m.max_marks} (${m.pct}%)`
      );
    });

    doc.end();

    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'DOWNLOAD_REPORT', 'students', student.student_id, req.ip]
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
