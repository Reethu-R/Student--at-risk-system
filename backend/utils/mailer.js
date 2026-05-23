/**
 * utils/mailer.js
 * Nodemailer — sends email alerts for High Risk students
 * Configure SMTP via environment variables
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Verify connection on startup
transporter.verify().then(() => {
  console.log('✅ Mailer ready');
}).catch(err => {
  console.warn('⚠️ Mailer not configured:', err.message);
});

/**
 * Send risk alert email to student (and optionally CC faculty)
 */
const sendRiskEmail = async ({ to, studentName, rollNo, risk_level, reason, attPct, avgMarks }) => {
  const riskColors = {
    high:   '#dc2626',
    medium: '#f97316',
    low:    '#eab308',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: ${riskColors[risk_level] || '#dc2626'}; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .body { padding: 30px; color: #333; }
        .badge { display: inline-block; background: ${riskColors[risk_level]}20; color: ${riskColors[risk_level]};
                 border: 2px solid ${riskColors[risk_level]}; border-radius: 4px; padding: 4px 12px;
                 font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .stat { background: #f8f8f8; border-radius: 6px; padding: 12px; margin: 8px 0; }
        .stat strong { color: #666; font-size: 12px; text-transform: uppercase; display: block; }
        .stat span { font-size: 20px; font-weight: bold; color: #111; }
        .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Academic Risk Alert</h1>
          <p style="margin:8px 0 0">PES Trust College — Student Risk Management System</p>
        </div>
        <div class="body">
          <p>Dear ${studentName},</p>
          <p>Your academic performance has been flagged as:</p>
          <p><span class="badge">${risk_level} Risk</span></p>
          <p><strong>Reason:</strong> ${reason}</p>

          <div style="display:flex;gap:16px;margin:20px 0">
            <div class="stat" style="flex:1">
              <strong>Attendance</strong>
              <span>${attPct !== null ? attPct + '%' : 'N/A'}</span>
            </div>
            <div class="stat" style="flex:1">
              <strong>Average Marks</strong>
              <span>${avgMarks !== null ? avgMarks + '%' : 'N/A'}</span>
            </div>
          </div>

          <p>Please contact your class teacher or HOD immediately to discuss an improvement plan.</p>
          <p style="color:#666;font-size:14px">Roll No: ${rollNo}</p>
        </div>
        <div class="footer">
          <p>This is an automated alert from the Student At-Risk Analysis System.</p>
          <p>© ${new Date().getFullYear()} PES Trust | pestrust.edu.in</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from:    `"PES Trust Risk Alert" <${process.env.SMTP_USER}>`,
    to,
    subject: `🚨 Academic Risk Alert — ${risk_level.toUpperCase()} | ${studentName} (${rollNo})`,
    html,
  });
};

/**
 * Generic email sender
 */
const sendMail = async ({ to, subject, html, text }) => {
  return transporter.sendMail({
    from: `"PES Trust System" <${process.env.SMTP_USER}>`,
    to, subject, html, text,
  });
};

module.exports = { sendRiskEmail, sendMail };
