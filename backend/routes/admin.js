/**
 * routes/admin.js
 * All admin-only endpoints — full system access
 */

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcrypt');
const { body, validationResult, query } = require('express-validator');
const pool       = require('../config/db');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const { isAdmin } = require('../middleware/roleCheck');

// All routes require admin role
router.use(isAdmin);

// ── GET /api/admin/dashboard ─────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const cacheKey = 'admin:dashboard';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  try {
    const [[stats]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_users,
        (SELECT COUNT(*) FROM students) AS total_students,
        (SELECT COUNT(*) FROM faculty) AS total_faculty,
        (SELECT COUNT(*) FROM departments) AS total_departments,
        (SELECT COUNT(*) FROM risk_flags WHERE risk_level = 'high') AS high_risk_count,
        (SELECT COUNT(*) FROM risk_flags WHERE risk_level = 'medium') AS medium_risk_count,
        (SELECT COUNT(*) FROM risk_flags WHERE risk_level = 'low') AS low_risk_count,
        (SELECT COUNT(*) FROM risk_flags WHERE risk_level = 'safe') AS safe_count,
        (SELECT COUNT(*) FROM attendance WHERE date = CURDATE()) AS attendance_today
    `);

    const [deptRisk] = await pool.execute(`
      SELECT d.name AS department, d.code,
             COUNT(CASE WHEN rf.risk_level = 'high'   THEN 1 END) AS high_risk,
             COUNT(CASE WHEN rf.risk_level = 'medium' THEN 1 END) AS medium_risk,
             COUNT(CASE WHEN rf.risk_level = 'low'    THEN 1 END) AS low_risk,
             COUNT(CASE WHEN rf.risk_level = 'safe'   THEN 1 END) AS safe
      FROM departments d
      LEFT JOIN students s ON d.department_id = s.department_id
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      GROUP BY d.department_id
    `);

    const data = { stats, deptRisk };
    await cacheSet(cacheKey, data, 300); // 5 min TTL
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/all-departments ───────────────────────────
router.get('/all-departments', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT d.*, u.name AS hod_name,
             COUNT(DISTINCT s.student_id) AS student_count,
             COUNT(DISTINCT f.faculty_id) AS faculty_count
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      LEFT JOIN students s ON d.department_id = s.department_id
      LEFT JOIN faculty f ON d.department_id = f.department_id
      GROUP BY d.department_id
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/all-faculty ───────────────────────────────
router.get('/all-faculty', async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.execute(`
      SELECT f.faculty_id, f.faculty_type, f.employee_id, f.subjects_assigned,
             u.user_id, u.name, u.email, u.is_active,
             d.name AS department_name, d.code AS dept_code
      FROM faculty f
      JOIN users u ON f.user_id = u.user_id
      JOIN departments d ON f.department_id = d.department_id
      ORDER BY f.faculty_type, d.name, u.name
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM faculty');
    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/all-students ──────────────────────────────
router.get('/all-students', async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.execute(`
      SELECT s.student_id, s.roll_no, s.semester, s.batch_year, s.section,
             u.user_id, u.name, u.email, u.is_active,
             d.name AS department_name, d.code AS dept_code,
             rf.risk_level, rf.att_percent, rf.avg_marks
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN risk_flags rf ON s.student_id = rf.student_id
      ORDER BY d.name, s.semester, s.roll_no
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM students');
    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/admin/create-user ──────────────────────────────
router.post('/create-user', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['admin','hod','teacher','student']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, email, password, role, department_id, roll_no, semester, batch_year, section, employee_id } = req.body;

    // Teacher emails must end with @pestrust.edu.in
    if (role === 'teacher' && !email.endsWith('@pestrust.edu.in')) {
      return res.status(400).json({ success: false, message: 'Teacher email must end with @pestrust.edu.in' });
    }
    if (role === 'hod' && !email.endsWith('@pestrust.edu.in')) {
      return res.status(400).json({ success: false, message: 'HOD email must end with @pestrust.edu.in' });
    }

    const hash = await bcrypt.hash(password, 12);

    const [userResult] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role, department_id || null]
    );
    const userId = userResult.insertId;

    // Create role-specific record
    if (role === 'student') {
      await conn.execute(
        'INSERT INTO students (user_id, roll_no, department_id, semester, batch_year, section) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, roll_no, department_id, semester, batch_year, section || 'A']
      );
    } else if (role === 'teacher' || role === 'hod') {
      const [fac] = await conn.execute(
        'INSERT INTO faculty (user_id, department_id, faculty_type, employee_id) VALUES (?, ?, ?, ?)',
        [userId, department_id, role, employee_id || null]
      );
      // If HOD, update department
      if (role === 'hod') {
        await conn.execute(
          'UPDATE departments SET hod_id = ? WHERE department_id = ?',
          [userId, department_id]
        );
      }
    }

    await conn.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'CREATE_USER', 'users', userId, req.ip]
    );

    await conn.commit();
    await cacheDelPattern('admin:*');

    return res.status(201).json({ success: true, message: 'User created', user_id: userId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email or roll number already exists' });
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ── PUT /api/admin/deactivate-user ───────────────────────────
router.put('/deactivate-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.execute('UPDATE users SET is_active = FALSE WHERE user_id = ?', [userId]);
    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'DEACTIVATE_USER', 'users', userId, req.ip]
    );
    await cacheDelPattern('admin:*');
    return res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/audit-logs ────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.execute(`
      SELECT al.*, u.name, u.email, u.role
      FROM audit_logs al
      JOIN users u ON al.user_id = u.user_id
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM audit_logs');
    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/admin/risk-thresholds ───────────────────────────
router.put('/risk-thresholds', [
  body('high_att').isFloat({ min: 0, max: 100 }),
  body('medium_att').isFloat({ min: 0, max: 100 }),
  body('low_att').isFloat({ min: 0, max: 100 }),
  body('high_marks').isFloat({ min: 0, max: 100 }),
  body('medium_marks').isFloat({ min: 0, max: 100 }),
  body('low_marks').isFloat({ min: 0, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { high_att, medium_att, low_att, high_marks, medium_marks, low_marks } = req.body;
    await pool.execute(`
      UPDATE risk_thresholds SET
        high_att = ?, medium_att = ?, low_att = ?,
        high_marks = ?, medium_marks = ?, low_marks = ?,
        updated_by = ?
      WHERE threshold_id = 1
    `, [high_att, medium_att, low_att, high_marks, medium_marks, low_marks, req.user.user_id]);

    await cacheDelPattern('thresholds:*');
    return res.json({ success: true, message: 'Risk thresholds updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
