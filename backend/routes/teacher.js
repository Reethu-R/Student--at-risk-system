/**
 * routes/teacher.js
 * Teacher endpoints — own students/subjects only
 * Excel uploads via Bull.js queue
 */

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const pool     = require('../config/db');
const { isTeacher } = require('../middleware/roleCheck');
const { uploadQueue } = require('../jobs/uploadQueue');
const XLSX     = require('xlsx');
const PDFDocument = require('pdfkit');

router.use(isTeacher);

// Multer — temp file storage for Excel uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${req.user.user_id}-${file.originalname}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ── GET /api/teacher/dashboard ───────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    // Get faculty record
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id, department_id, subjects_assigned FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty record not found' });

    const [subjects] = await pool.execute(
      'SELECT * FROM subjects WHERE faculty_id = ?',
      [faculty.faculty_id]
    );

    const subjectIds = subjects.map(s => s.subject_id);
    if (!subjectIds.length) {
      return res.json({ success: true, data: { subjects: [], totalStudents: 0, alerts: 0 } });
    }

    const placeholders = subjectIds.map(() => '?').join(',');
    const [[{ totalStudents }]] = await pool.execute(
      `SELECT COUNT(DISTINCT a.student_id) AS totalStudents FROM attendance a WHERE a.subject_id IN (${placeholders})`,
      subjectIds
    );

    const [[{ alerts }]] = await pool.execute(
      'SELECT COUNT(*) AS alerts FROM alerts WHERE faculty_id = ? AND is_read = FALSE',
      [faculty.faculty_id]
    );

    const [riskSummary] = await pool.execute(`
      SELECT rf.risk_level, COUNT(*) AS count
      FROM risk_flags rf
      JOIN students s ON rf.student_id = s.student_id
      WHERE s.department_id = ?
      GROUP BY rf.risk_level
    `, [faculty.department_id]);

    return res.json({ success: true, data: { subjects, totalStudents, alerts, riskSummary } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/teacher/my-students ─────────────────────────────
router.get('/my-students', async (req, res) => {
  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT DISTINCT s.student_id, s.roll_no, s.semester, s.section,
             u.name, u.email,
             rf.risk_level, rf.att_percent, rf.avg_marks
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      JOIN attendance a ON s.student_id = a.student_id
      JOIN subjects sub ON a.subject_id = sub.subject_id
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      WHERE sub.faculty_id = ?
      ORDER BY s.roll_no
    `, [faculty.faculty_id]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teacher/manual-attendance ──────────────────────
router.post('/manual-attendance', async (req, res) => {
  const { student_id, subject_id, date, status } = req.body;
  if (!student_id || !subject_id || !date || !status) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    await pool.execute(
      `INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [student_id, subject_id, date, status, faculty.faculty_id]
    );

    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'ADD_ATTENDANCE', 'students', student_id, req.ip]
    );

    // Trigger async risk re-evaluation for this student
    const { triggerRiskForStudent } = require('../jobs/riskEngine');
    triggerRiskForStudent(student_id).catch(console.error);

    return res.json({ success: true, message: 'Attendance recorded' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teacher/upload-attendance ─────────────────────
router.post('/upload-attendance', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded or invalid format' });
  }

  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    // Queue the job — returns immediately
    await uploadQueue.add('attendance', {
      filePath:   req.file.path,
      faculty_id: faculty.faculty_id,
      user_id:    req.user.user_id,
      subject_id: req.body.subject_id,
    });

    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, ip_address) VALUES (?, ?, ?, ?)',
      [req.user.user_id, 'UPLOAD_ATTENDANCE', 'attendance', req.ip]
    );

    return res.json({
      success: true,
      message: 'Upload received, processing in background...',
      jobQueued: true,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teacher/manual-marks ───────────────────────────
router.post('/manual-marks', async (req, res) => {
  const { student_id, subject_id, exam_type, marks_obtained, max_marks, exam_date } = req.body;
  if (!student_id || !subject_id || !exam_type || marks_obtained == null || !max_marks) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    await pool.execute(
      `INSERT INTO marks (student_id, subject_id, exam_type, marks_obtained, max_marks, entered_by, exam_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks)`,
      [student_id, subject_id, exam_type, marks_obtained, max_marks, faculty.faculty_id, exam_date || null]
    );

    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'ADD_MARKS', 'students', student_id, req.ip]
    );

    const { triggerRiskForStudent } = require('../jobs/riskEngine');
    triggerRiskForStudent(student_id).catch(console.error);

    return res.json({ success: true, message: 'Marks recorded' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teacher/upload-marks ───────────────────────────
router.post('/upload-marks', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file or invalid format' });
  }
  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    await uploadQueue.add('marks', {
      filePath:   req.file.path,
      faculty_id: faculty.faculty_id,
      user_id:    req.user.user_id,
      subject_id: req.body.subject_id,
      exam_type:  req.body.exam_type,
    });

    return res.json({
      success: true,
      message: 'Marks upload queued for processing...',
      jobQueued: true,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/teacher/my-alerts ───────────────────────────────
router.get('/my-alerts', async (req, res) => {
  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT al.*, u.name AS student_name, s.roll_no
      FROM alerts al
      JOIN students s ON al.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE al.faculty_id = ?
      ORDER BY al.created_at DESC
      LIMIT 100
    `, [faculty.faculty_id]);

    // Mark as read
    await pool.execute(
      'UPDATE alerts SET is_read = TRUE WHERE faculty_id = ?',
      [faculty.faculty_id]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/teacher/download-attendance ─────────────────────
router.get('/download-attendance', async (req, res) => {
  try {
    const [[faculty]] = await pool.execute(
      'SELECT faculty_id FROM faculty WHERE user_id = ?',
      [req.user.user_id]
    );

    const [rows] = await pool.execute(`
      SELECT s.roll_no, u.name, sub.name AS subject, a.date, a.status
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE sub.faculty_id = ?
      ORDER BY a.date DESC, s.roll_no
    `, [faculty.faculty_id]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
