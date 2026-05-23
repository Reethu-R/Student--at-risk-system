# 🎓 Student At-Risk Analysis System
### PES Trust Educational Institutions — Production-Grade ERP

> Handles **4000+ concurrent users** | Role-based | Real-time alerts | Excel bulk upload | At-risk AI engine

---

## 📋 Table of Contents
1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Running the Project](#running-the-project)
6. [Default Login Credentials](#default-login-credentials)
7. [API Reference](#api-reference)
8. [Excel Upload Format](#excel-upload-format)
9. [Deployment (Production)](#deployment-production)
10. [Troubleshooting](#troubleshooting)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router v6 |
| Charts | Recharts |
| Backend | Node.js 18+ + Express.js |
| Database | MySQL 8.0+ (100-connection pool) |
| Cache | Redis 7+ (session + query cache) |
| Queue | Bull.js + Redis (async Excel processing) |
| Auth | JWT (15min) + Refresh Token (7d) + bcrypt |
| File Handling | SheetJS (xlsx upload), PDFKit (PDF download) |
| Real-time | Socket.io |
| Process Mgr | PM2 Cluster Mode |

---

## ✅ Prerequisites

Install these before starting:

| Software | Version | Download |
|----------|---------|----------|
| Node.js  | ≥ 18.0  | https://nodejs.org |
| MySQL    | ≥ 8.0   | https://mysql.com |
| Redis    | ≥ 7.0   | https://redis.io |
| npm      | ≥ 9.0   | Comes with Node |

---

## 📁 Project Structure

```
student-risk-system/
├── backend/
│   ├── config/          # DB, Redis, Socket.io
│   ├── middleware/       # JWT auth, role check
│   ├── routes/          # API endpoints (auth/admin/hod/teacher/student)
│   ├── jobs/            # Bull.js queue + risk engine cron
│   ├── utils/           # Mailer, Excel parser
│   ├── uploads/         # Temp Excel files (auto-cleaned)
│   ├── .env.example     # Environment variable template
│   ├── ecosystem.config.js  # PM2 cluster config
│   ├── package.json
│   └── server.js        # Express app entry
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/     # AuthContext (JWT + axios interceptors)
│   │   ├── components/  # Sidebar, Navbar
│   │   ├── pages/       # Admin / HOD / Teacher / Student pages
│   │   └── App.jsx      # Router + protected routes
│   └── package.json
│
└── database/
    └── schema.sql       # All CREATE TABLE + seed data
```

---

## 🚀 Step-by-Step Setup

### STEP 1 — Clone / Extract the Project

```bash
# If using zip:
unzip student-risk-system.zip
cd student-risk-system
```

---

### STEP 2 — Start MySQL and Create Database

```bash
# Log into MySQL
mysql -u root -p

# Inside MySQL shell:
CREATE DATABASE student_risk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Import the schema (all tables + seed data):
mysql -u root -p student_risk_db < database/schema.sql
```

---

### STEP 3 — Start Redis

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows:**
Download from: https://github.com/microsoftarchive/redis/releases  
Or use Docker: `docker run -d -p 6379:6379 redis`

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

---

### STEP 4 — Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:3000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_risk_db

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT — CHANGE THESE (use any long random string)
JWT_SECRET=your_super_long_secret_key_at_least_64_characters_long_here
JWT_REFRESH_SECRET=another_different_super_long_secret_key_for_refresh_tokens

# Email (optional — needed for High Risk email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

> 💡 **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords

---

### STEP 5 — Install Backend Dependencies

```bash
# From inside /backend folder
npm install
```

---

### STEP 6 — Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Project

### Development Mode (Recommended for first run)

Open **2 terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# React app opens at http://localhost:3000
```

✅ Open your browser at: **http://localhost:3000**

---

### Production Mode (PM2 Cluster)

```bash
# Install PM2 globally
npm install -g pm2

# Build React frontend
cd frontend
npm run build

# Start backend in cluster mode (uses all CPU cores)
cd ../backend
pm2 start ecosystem.config.js --env production

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup

# Monitor processes
pm2 monit
pm2 logs
```

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@pestrust.edu.in | Admin@123 |

> After logging in as Admin, use **"Add Faculty"** and **"Enroll Student"** buttons to create more users.

### Important Email Rules:
- **Teachers & HODs**: Email MUST end with `@pestrust.edu.in`
- **Students**: Any email format is accepted
- **Admin**: Any email format is accepted

---

## 🌐 API Reference

### Authentication
```
POST /api/auth/login          → All roles
POST /api/auth/logout         → All roles
POST /api/auth/refresh-token  → All roles
```

### Admin (requires admin JWT)
```
GET  /api/admin/dashboard
GET  /api/admin/all-departments
GET  /api/admin/all-faculty?page=1&limit=50
GET  /api/admin/all-students?page=1&limit=50
POST /api/admin/create-user
PUT  /api/admin/deactivate-user/:userId
GET  /api/admin/audit-logs?page=1
PUT  /api/admin/risk-thresholds
```

### HOD (requires hod JWT)
```
GET  /api/hod/dashboard
GET  /api/hod/my-teachers
GET  /api/hod/my-students?semester=3
GET  /api/hod/dept-attendance
GET  /api/hod/dept-marks
GET  /api/hod/dept-atrisk
GET  /api/hod/download-report   → PDF download
```

### Teacher (requires teacher JWT)
```
GET  /api/teacher/dashboard
GET  /api/teacher/my-students
POST /api/teacher/manual-attendance
POST /api/teacher/upload-attendance   → multipart/form-data
POST /api/teacher/manual-marks
POST /api/teacher/upload-marks        → multipart/form-data
GET  /api/teacher/my-alerts
GET  /api/teacher/download-attendance → Excel download
```

### Student (requires student JWT)
```
GET  /api/student/dashboard
GET  /api/student/my-attendance
GET  /api/student/my-marks
GET  /api/student/my-risk-status
GET  /api/student/my-alerts
GET  /api/student/download-report     → PDF download
```

### Analysis
```
GET  /api/analysis/chart-attendance?department_id=1
GET  /api/analysis/chart-marks?department_id=1
GET  /api/analysis/chart-riskdist?department_id=1
GET  /api/analysis/risk-engine        → Manual trigger (admin/hod)
```

---

## 📊 Excel Upload Format

### Attendance Upload (.xlsx or .csv)
| Column | Format | Example |
|--------|--------|---------|
| roll_no | String | CSE2024001 |
| date | YYYY-MM-DD | 2024-11-15 |
| status | present / absent | present |

### Marks Upload (.xlsx or .csv)
| Column | Format | Example |
|--------|--------|---------|
| roll_no | String | CSE2024001 |
| marks_obtained | Number | 78 |
| max_marks | Number | 100 |

---

## ⚠️ At-Risk Engine Logic

| Risk Level | Attendance | OR Avg Marks |
|------------|-----------|-------------|
| 🔴 High    | < 60%     | < 35% |
| 🟠 Medium  | 60–74%    | 35–49% |
| 🟡 Low     | 75–84%    | 50–59% |
| 🟢 Safe    | ≥ 85%     | ≥ 60% |

**Triggers:**
- Automatically every day at 2:00 AM (cron)
- Instantly after every Excel upload
- Manually via `/api/analysis/risk-engine` (admin/hod)

**On High Risk Detection:**
- Updates `risk_flags` table
- Sends Socket.io alert to teacher & HOD
- Sends email to student (if SMTP configured)

---

## ☁️ Deployment (Production — AWS EC2 / Railway)

### Minimum Requirements
- 2 vCPUs, 2GB RAM
- MySQL 8.0 (RDS recommended)
- Redis 7 (ElastiCache or Upstash)

### Steps
```bash
# 1. Set NODE_ENV=production in .env
# 2. Build frontend
cd frontend && npm run build

# 3. Copy build to backend (or configure reverse proxy)
# 4. Start with PM2
cd backend && pm2 start ecosystem.config.js --env production

# 5. Nginx config example:
# server {
#   listen 80;
#   server_name erp.pestrust.edu.in;
#   location / { proxy_pass http://localhost:5000; }
#   location /socket.io { proxy_pass http://localhost:5000; proxy_http_version 1.1; }
# }
```

---

## 🐛 Troubleshooting

### "Cannot connect to MySQL"
```bash
# Check MySQL is running
sudo systemctl status mysql
# Verify credentials in .env match your MySQL setup
mysql -u root -p -e "SHOW DATABASES;"
```

### "Redis connection refused"
```bash
# Check Redis is running
redis-cli ping   # Should return PONG
sudo systemctl start redis
```

### "Port 5000 already in use"
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9
# Or change PORT in .env
```

### "npm install fails"
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Teacher email rejected
- Must end with `@pestrust.edu.in`
- Example: `john.doe@pestrust.edu.in`

### JWT token expired errors
- Access tokens expire in 15 minutes
- The frontend auto-refreshes using the refresh token cookie
- If both expire, you'll be redirected to login

---

## 📞 Support

For institutional support, contact: **it-support@pestrust.edu.in**

---

*© 2024 PES Trust Educational Institutions. All rights reserved.*
