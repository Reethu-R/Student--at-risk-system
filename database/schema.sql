-- ============================================================
-- Student At-Risk Analysis System - Complete Database Schema
-- Version: 1.0.0  |  Target: MySQL 8.0+
-- Supports: 4000+ concurrent users, connection pooling
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS risk_flags;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- ============================================================
-- USERS TABLE
-- Central auth table for all roles
-- ============================================================
CREATE TABLE users (
  user_id       INT          PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','hod','teacher','student') NOT NULL,
  department_id INT          DEFAULT NULL,
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role        (role),
  INDEX idx_department  (department_id),
  INDEX idx_email       (email),
  INDEX idx_active      (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE departments (
  department_id INT          PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(10)  NOT NULL UNIQUE,
  hod_id        INT          DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hod (hod_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FACULTY TABLE
-- Both HODs and Teachers
-- ============================================================
CREATE TABLE faculty (
  faculty_id        INT          PRIMARY KEY AUTO_INCREMENT,
  user_id           INT          NOT NULL,
  department_id     INT          NOT NULL,
  faculty_type      ENUM('hod','teacher') NOT NULL DEFAULT 'teacher',
  employee_id       VARCHAR(20)  UNIQUE,
  subjects_assigned JSON         DEFAULT NULL,
  joined_date       DATE         DEFAULT NULL,
  INDEX idx_user    (user_id),
  INDEX idx_dept    (department_id),
  INDEX idx_type    (faculty_type),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- STUDENTS TABLE
-- ============================================================
CREATE TABLE students (
  student_id    INT          PRIMARY KEY AUTO_INCREMENT,
  user_id       INT          NOT NULL,
  roll_no       VARCHAR(20)  NOT NULL UNIQUE,
  department_id INT          NOT NULL,
  semester      INT          NOT NULL CHECK (semester BETWEEN 1 AND 8),
  batch_year    YEAR         NOT NULL,
  section       VARCHAR(5)   DEFAULT 'A',
  INDEX idx_user       (user_id),
  INDEX idx_dept       (department_id),
  INDEX idx_semester   (semester),
  INDEX idx_roll       (roll_no),
  INDEX idx_batch      (batch_year),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SUBJECTS TABLE
-- ============================================================
CREATE TABLE subjects (
  subject_id    INT          PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  subject_code  VARCHAR(20)  NOT NULL UNIQUE,
  department_id INT          NOT NULL,
  semester      INT          NOT NULL,
  faculty_id    INT          DEFAULT NULL,
  credits       INT          DEFAULT 3,
  INDEX idx_faculty (faculty_id),
  INDEX idx_dept    (department_id),
  INDEX idx_sem     (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ATTENDANCE TABLE
-- Indexed for high-volume queries
-- ============================================================
CREATE TABLE attendance (
  attendance_id INT          PRIMARY KEY AUTO_INCREMENT,
  student_id    INT          NOT NULL,
  subject_id    INT          NOT NULL,
  date          DATE         NOT NULL,
  status        ENUM('present','absent') NOT NULL,
  marked_by     INT          NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance (student_id, subject_id, date),
  INDEX idx_student   (student_id),
  INDEX idx_subject   (subject_id),
  INDEX idx_date      (date),
  INDEX idx_status    (status),
  INDEX idx_marked_by (marked_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MARKS TABLE
-- ============================================================
CREATE TABLE marks (
  mark_id        INT          PRIMARY KEY AUTO_INCREMENT,
  student_id     INT          NOT NULL,
  subject_id     INT          NOT NULL,
  exam_type      ENUM('internal','midterm','final') NOT NULL,
  marks_obtained FLOAT        NOT NULL CHECK (marks_obtained >= 0),
  max_marks      FLOAT        NOT NULL CHECK (max_marks > 0),
  entered_by     INT          NOT NULL,
  exam_date      DATE         DEFAULT NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marks (student_id, subject_id, exam_type),
  INDEX idx_student   (student_id),
  INDEX idx_subject   (subject_id),
  INDEX idx_exam_type (exam_type),
  INDEX idx_entered   (entered_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK FLAGS TABLE
-- Updated by at-risk engine (cron + post-upload)
-- ============================================================
CREATE TABLE risk_flags (
  flag_id     INT          PRIMARY KEY AUTO_INCREMENT,
  student_id  INT          NOT NULL,
  risk_level  ENUM('high','medium','low','safe') NOT NULL DEFAULT 'safe',
  reason      TEXT         DEFAULT NULL,
  att_percent FLOAT        DEFAULT NULL,
  avg_marks   FLOAT        DEFAULT NULL,
  flagged_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student (student_id),
  INDEX idx_student    (student_id),
  INDEX idx_risk       (risk_level),
  INDEX idx_flagged    (flagged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ALERTS TABLE
-- Real-time Socket.io + email notifications
-- ============================================================
CREATE TABLE alerts (
  alert_id   INT          PRIMARY KEY AUTO_INCREMENT,
  faculty_id INT          NOT NULL,
  student_id INT          NOT NULL,
  message    TEXT         NOT NULL,
  alert_type ENUM('attendance','marks','risk') DEFAULT 'risk',
  is_read    BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_faculty    (faculty_id),
  INDEX idx_student    (student_id),
  INDEX idx_read       (is_read),
  INDEX idx_created    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUDIT LOGS TABLE
-- Full trail: login, upload, download, data changes
-- ============================================================
CREATE TABLE audit_logs (
  log_id     INT          PRIMARY KEY AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  action     VARCHAR(255) NOT NULL,
  entity     VARCHAR(50)  DEFAULT NULL,
  entity_id  INT          DEFAULT NULL,
  details    JSON         DEFAULT NULL,
  timestamp  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50)  DEFAULT NULL,
  user_agent TEXT         DEFAULT NULL,
  INDEX idx_user      (user_id),
  INDEX idx_action    (action),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK THRESHOLDS TABLE
-- Configurable by Admin only
-- ============================================================
CREATE TABLE risk_thresholds (
  threshold_id  INT   PRIMARY KEY AUTO_INCREMENT,
  high_att      FLOAT NOT NULL DEFAULT 60.0,
  medium_att    FLOAT NOT NULL DEFAULT 75.0,
  low_att       FLOAT NOT NULL DEFAULT 85.0,
  high_marks    FLOAT NOT NULL DEFAULT 35.0,
  medium_marks  FLOAT NOT NULL DEFAULT 50.0,
  low_marks     FLOAT NOT NULL DEFAULT 60.0,
  updated_by    INT   NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REFRESH TOKENS TABLE
-- Stateless JWT + Redis-backed sessions
-- ============================================================
CREATE TABLE refresh_tokens (
  token_id   INT          PRIMARY KEY AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user  (user_id),
  INDEX idx_token (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA - Admin & Sample Departments
-- Password: Admin@123 (bcrypt hash salt=12)
-- ============================================================

INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('System Administrator', 'admin@pestrust.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMeBl6e.qXp2v1J9GkQ3FgD9Uy', 'admin', NULL);

INSERT INTO departments (name, code) VALUES
('Computer Science Engineering',    'CSE'),
('Electronics & Communication',     'ECE'),
('Mechanical Engineering',          'ME'),
('Civil Engineering',               'CE'),
('Information Technology',          'IT'),
('Electrical Engineering',          'EE');

INSERT INTO risk_thresholds (high_att, medium_att, low_att, high_marks, medium_marks, low_marks, updated_by) VALUES
(60.0, 75.0, 85.0, 35.0, 50.0, 60.0, 1);

-- ============================================================
-- VIEWS for common queries (performance optimization)
-- ============================================================

CREATE OR REPLACE VIEW v_student_attendance_summary AS
SELECT 
  s.student_id,
  s.roll_no,
  u.name AS student_name,
  s.department_id,
  s.semester,
  sub.subject_id,
  sub.name AS subject_name,
  COUNT(a.attendance_id) AS total_classes,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
  ROUND(
    (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.attendance_id)) * 100, 2
  ) AS attendance_pct
FROM students s
JOIN users u ON s.user_id = u.user_id
JOIN attendance a ON s.student_id = a.student_id
JOIN subjects sub ON a.subject_id = sub.subject_id
GROUP BY s.student_id, sub.subject_id;

CREATE OR REPLACE VIEW v_student_marks_summary AS
SELECT
  s.student_id,
  s.roll_no,
  u.name AS student_name,
  s.department_id,
  s.semester,
  sub.subject_id,
  sub.name AS subject_name,
  m.exam_type,
  m.marks_obtained,
  m.max_marks,
  ROUND((m.marks_obtained / m.max_marks) * 100, 2) AS marks_pct
FROM students s
JOIN users u ON s.user_id = u.user_id
JOIN marks m ON s.student_id = m.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id;

COMMIT;
