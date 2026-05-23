/**
 * jobs/riskEngine.js
 * At-Risk Detection Engine
 * - Runs every 24 hours via node-cron
 * - Triggers instantly after every Excel upload
 * - Sends Socket.io alerts to teacher & HOD
 * - Sends email via Nodemailer for High Risk students
 *
 * Risk Logic:
 * 🔴 High   → att < 60%  OR  avg marks < 35%
 * 🟠 Medium → att 60-74% OR  avg marks 35-49%
 * 🟡 Low    → att 75-84% OR  avg marks 50-59%
 * 🟢 Safe   → att ≥ 85%  AND avg marks ≥ 60%
 */

const cron   = require('node-cron');
const pool   = require('../config/db');
const { notifyUser, notifyDept } = require('../config/socket');
const { sendRiskEmail } = require('../utils/mailer');
const { cacheGet, cacheSet } = require('../config/redis');

// ── Fetch current thresholds (cached) ────────────────────────
const getThresholds = async () => {
  const cached = await cacheGet('thresholds:current');
  if (cached) return cached;

  const [[row]] = await pool.execute('SELECT * FROM risk_thresholds WHERE threshold_id = 1');
  const thresholds = row || {
    high_att:    60, medium_att:  75, low_att:    85,
    high_marks:  35, medium_marks: 50, low_marks: 60,
  };
  await cacheSet('thresholds:current', thresholds, 600);
  return thresholds;
};

// ── Compute risk level for one student ───────────────────────
const computeRisk = (attPct, avgMarks, t) => {
  // Handle missing data
  const att   = attPct   ?? 100;
  const marks = avgMarks ?? 100;

  if (att < t.high_att || marks < t.high_marks) {
    const reasons = [];
    if (att < t.high_att)   reasons.push(`Attendance ${att.toFixed(1)}% < ${t.high_att}%`);
    if (marks < t.high_marks) reasons.push(`Avg marks ${marks.toFixed(1)}% < ${t.high_marks}%`);
    return { risk_level: 'high', reason: reasons.join('; ') };
  }
  if (att < t.medium_att || marks < t.medium_marks) {
    const reasons = [];
    if (att < t.medium_att)   reasons.push(`Attendance ${att.toFixed(1)}%`);
    if (marks < t.medium_marks) reasons.push(`Avg marks ${marks.toFixed(1)}%`);
    return { risk_level: 'medium', reason: reasons.join('; ') };
  }
  if (att < t.low_att || marks < t.low_marks) {
    return { risk_level: 'low', reason: `Attendance ${att.toFixed(1)}% or marks ${marks.toFixed(1)}% below threshold` };
  }
  return { risk_level: 'safe', reason: 'All metrics within acceptable range' };
};

// ── Full risk engine run ──────────────────────────────────────
const runRiskEngine = async () => {
  console.log('🔍 Risk engine started:', new Date().toISOString());
  const thresholds = await getThresholds();

  try {
    // Fetch all students with their attendance + marks in one query
    const [students] = await pool.execute(`
      SELECT
        s.student_id,
        s.department_id,
        u.name AS student_name,
        u.email AS student_email,
        s.roll_no,
        s.semester,
        att_data.att_pct,
        marks_data.avg_marks_pct
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN (
        SELECT student_id,
               ROUND(SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/COUNT(*)*100, 2) AS att_pct
        FROM attendance
        GROUP BY student_id
      ) att_data ON s.student_id = att_data.student_id
      LEFT JOIN (
        SELECT student_id,
               ROUND(AVG((marks_obtained/max_marks)*100), 2) AS avg_marks_pct
        FROM marks
        GROUP BY student_id
      ) marks_data ON s.student_id = marks_data.student_id
    `);

    let highRiskCount = 0;

    for (const student of students) {
      const { risk_level, reason } = computeRisk(
        student.att_pct,
        student.avg_marks_pct,
        thresholds
      );

      // Upsert risk_flags
      await pool.execute(
        `INSERT INTO risk_flags (student_id, risk_level, reason, att_percent, avg_marks)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           risk_level = VALUES(risk_level),
           reason     = VALUES(reason),
           att_percent = VALUES(att_percent),
           avg_marks  = VALUES(avg_marks),
           flagged_at = CURRENT_TIMESTAMP`,
        [student.student_id, risk_level, reason, student.att_pct, student.avg_marks_pct]
      );

      // Send alerts for non-safe students
      if (risk_level !== 'safe') {
        const alertMsg = `⚠️ ${student.student_name} (${student.roll_no}) is ${risk_level.toUpperCase()} risk. ${reason}`;

        // Get teachers for this student's subjects
        const [teachers] = await pool.execute(`
          SELECT DISTINCT f.faculty_id, f.user_id
          FROM subjects sub
          JOIN faculty f ON sub.faculty_id = f.faculty_id
          WHERE sub.department_id = ? AND sub.semester = ?
        `, [student.department_id, student.semester]);

        for (const teacher of teachers) {
          // Insert alert record
          await pool.execute(
            `INSERT INTO alerts (faculty_id, student_id, message, alert_type)
             VALUES (?, ?, ?, 'risk')`,
            [teacher.faculty_id, student.student_id, alertMsg]
          );
          // Socket.io notification
          notifyUser(teacher.user_id, 'risk:alert', {
            student_name: student.student_name,
            roll_no:      student.roll_no,
            risk_level,
            reason,
          });
        }

        // Notify HOD
        notifyDept(student.department_id, 'risk:alert', {
          student_name: student.student_name,
          roll_no:      student.roll_no,
          risk_level,
          reason,
        });

        // Email for HIGH risk students only
        if (risk_level === 'high') {
          highRiskCount++;
          sendRiskEmail({
            to:           student.student_email,
            studentName:  student.student_name,
            rollNo:       student.roll_no,
            risk_level,
            reason,
            attPct:       student.att_pct,
            avgMarks:     student.avg_marks_pct,
          }).catch(err => console.error('Email error:', err.message));
        }
      }
    }

    console.log(`✅ Risk engine complete. Processed ${students.length} students. High risk: ${highRiskCount}`);
  } catch (err) {
    console.error('❌ Risk engine error:', err.message);
  }
};

// ── Per-student instant trigger (after manual entry) ─────────
const triggerRiskForStudent = async (studentId) => {
  const thresholds = await getThresholds();

  const [[data]] = await pool.execute(`
    SELECT
      s.student_id, s.department_id, s.semester, u.name, u.email, s.roll_no,
      att_data.att_pct, marks_data.avg_marks_pct
    FROM students s JOIN users u ON s.user_id = u.user_id
    LEFT JOIN (
      SELECT student_id, ROUND(SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/COUNT(*)*100,2) AS att_pct
      FROM attendance WHERE student_id = ? GROUP BY student_id
    ) att_data ON s.student_id = att_data.student_id
    LEFT JOIN (
      SELECT student_id, ROUND(AVG((marks_obtained/max_marks)*100),2) AS avg_marks_pct
      FROM marks WHERE student_id = ? GROUP BY student_id
    ) marks_data ON s.student_id = marks_data.student_id
    WHERE s.student_id = ?
  `, [studentId, studentId, studentId]);

  if (!data) return;

  const { risk_level, reason } = computeRisk(data.att_pct, data.avg_marks_pct, thresholds);

  await pool.execute(
    `INSERT INTO risk_flags (student_id, risk_level, reason, att_percent, avg_marks)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE risk_level = VALUES(risk_level), reason = VALUES(reason),
       att_percent = VALUES(att_percent), avg_marks = VALUES(avg_marks), flagged_at = CURRENT_TIMESTAMP`,
    [data.student_id, risk_level, reason, data.att_pct, data.avg_marks_pct]
  );
};

// ── Cron: every day at 2:00 AM ───────────────────────────────
const startCron = () => {
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ Daily risk engine triggered by cron');
    runRiskEngine();
  });
  console.log('⏰ Risk engine cron scheduled: 2:00 AM daily');
};

module.exports = { runRiskEngine, triggerRiskForStudent, startCron };
