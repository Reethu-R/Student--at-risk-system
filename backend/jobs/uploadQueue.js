/**
 * jobs/uploadQueue.js
 * Bull.js queue for async Excel processing
 * Batch insert: 500 rows per transaction
 * Notifies teacher via Socket.io on completion
 */

const Queue = require('bull');
const XLSX  = require('xlsx');
const fs    = require('fs');
const pool  = require('../config/db');
const { notifyUser } = require('../config/socket');

// Create queue using Redis
const uploadQueue = new Queue('excel-upload', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const BATCH_SIZE = 500;

// ── Process attendance uploads ───────────────────────────────
const processAttendance = async (data) => {
  const { filePath, faculty_id, user_id, subject_id } = data;

  const wb    = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet);

  // Expected columns: roll_no, date, status (present/absent)
  const conn = await pool.getConnection();
  try {
    let processed = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await conn.beginTransaction();

      for (const row of batch) {
        const rollNo = row.roll_no || row.RollNo || row['Roll No'];
        const date   = row.date   || row.Date;
        const status = (row.status || row.Status || 'present').toLowerCase();

        if (!rollNo || !date) continue;

        const [[student]] = await conn.execute(
          'SELECT student_id FROM students WHERE roll_no = ?',
          [String(rollNo).trim()]
        );
        if (!student) continue;

        await conn.execute(
          `INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [student.student_id, subject_id, date, status, faculty_id]
        );
        processed++;
      }

      await conn.commit();
    }
    return processed;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Process marks uploads ────────────────────────────────────
const processMarks = async (data) => {
  const { filePath, faculty_id, subject_id, exam_type } = data;

  const wb    = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet);

  // Expected columns: roll_no, marks_obtained, max_marks
  const conn = await pool.getConnection();
  try {
    let processed = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await conn.beginTransaction();

      for (const row of batch) {
        const rollNo  = row.roll_no   || row.RollNo || row['Roll No'];
        const obtained = parseFloat(row.marks_obtained || row.Marks || row.Score || 0);
        const maxMarks = parseFloat(row.max_marks || row.MaxMarks || row.Total || 100);

        if (!rollNo || isNaN(obtained)) continue;

        const [[student]] = await conn.execute(
          'SELECT student_id FROM students WHERE roll_no = ?',
          [String(rollNo).trim()]
        );
        if (!student) continue;

        await conn.execute(
          `INSERT INTO marks (student_id, subject_id, exam_type, marks_obtained, max_marks, entered_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks)`,
          [student.student_id, subject_id, exam_type, obtained, maxMarks, faculty_id]
        );
        processed++;
      }

      await conn.commit();
    }
    return processed;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Queue processor ──────────────────────────────────────────
uploadQueue.process('attendance', 5, async (job) => {
  const { filePath, user_id } = job.data;
  try {
    const count = await processAttendance(job.data);

    // Trigger risk engine
    const { runRiskEngine } = require('./riskEngine');
    runRiskEngine().catch(console.error);

    // Notify teacher via Socket.io
    notifyUser(user_id, 'upload:complete', {
      type: 'attendance',
      message: `✅ Attendance upload complete! ${count} records processed.`,
    });

    // Cleanup temp file
    fs.unlinkSync(filePath);
    return { success: true, count };
  } catch (err) {
    notifyUser(user_id, 'upload:error', {
      message: `❌ Attendance upload failed: ${err.message}`,
    });
    throw err;
  }
});

uploadQueue.process('marks', 5, async (job) => {
  const { filePath, user_id } = job.data;
  try {
    const count = await processMarks(job.data);

    const { runRiskEngine } = require('./riskEngine');
    runRiskEngine().catch(console.error);

    notifyUser(user_id, 'upload:complete', {
      type: 'marks',
      message: `✅ Marks upload complete! ${count} records processed.`,
    });

    fs.unlinkSync(filePath);
    return { success: true, count };
  } catch (err) {
    notifyUser(user_id, 'upload:error', {
      message: `❌ Marks upload failed: ${err.message}`,
    });
    throw err;
  }
});

uploadQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

module.exports = { uploadQueue };
