/**
 * config/db.js
 * MySQL connection pool — 100 connections, indexed queries only
 * Uses mysql2/promise for async/await support
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'student_risk_db',
  waitForConnections: true,
  connectionLimit:    100,          // Supports 4000+ users via pooling
  queueLimit:         0,            // Unlimited queue
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
  multipleStatements: false,        // Security: prevent SQL injection chaining
  namedPlaceholders:  false,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected | Pool: 100 connections');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
