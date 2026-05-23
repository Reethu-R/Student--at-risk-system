/**
 * server.js
 * Main Express application — production-grade setup
 * PM2 cluster mode: uses all CPU cores
 * Supports 4000+ concurrent users via connection pooling + Redis
 */

require('dotenv').config();
const express        = require('express');
const http           = require('http');
const cors           = require('cors');
const helmet         = require('helmet');
const compression    = require('compression');
const rateLimit      = require('express-rate-limit');
const cookieParser   = require('cookie-parser');
const morgan         = require('morgan');
const path           = require('path');

const { initSocket }   = require('./config/socket');
const { authenticate } = require('./middleware/auth');

// ── Routes ───────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const hodRoutes      = require('./routes/hod');
const teacherRoutes  = require('./routes/teacher');
const studentRoutes  = require('./routes/student');
const analysisRoutes = require('./routes/analysis');

// ── Risk engine cron ─────────────────────────────────────────
const { startCron } = require('./jobs/riskEngine');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
initSocket(server);

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
}));

// ── CORS — restricted to college domain ──────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  'https://erp.pestrust.edu.in',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked'));
  },
  credentials: true,
}));

// ── Rate limiting: 100 req/min per IP ────────────────────────
const limiter = rateLimit({
  windowMs:    60 * 1000,
  max:         100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please wait.' },
});
app.use('/api/', limiter);

// ── Body parsing + compression ────────────────────────────────
app.use(compression()); // Gzip all responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Static uploads ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    pid:    process.pid,
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    env:    process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    authenticate, adminRoutes);
app.use('/api/hod',      authenticate, hodRoutes);
app.use('/api/teacher',  authenticate, teacherRoutes);
app.use('/api/student',  authenticate, studentRoutes);
app.use('/api/analysis', analysisRoutes);

// ── Serve React frontend in production ────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} | PID: ${process.pid}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start risk engine cron (only on primary PM2 worker to avoid duplicate emails)
  if (!process.env.PM2_HOME || process.env.NODE_APP_INSTANCE === '0') {
    startCron();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Graceful shutdown...');
  server.close(() => process.exit(0));
});

module.exports = app;
