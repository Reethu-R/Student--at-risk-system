/**
 * utils/pdfGenerator.js
 * PDFKit helpers for report generation
 */

const PDFDocument = require('pdfkit');

/**
 * Generate a student personal report PDF
 * @param {Object} params
 * @returns {PDFDocument} doc — pipe to res
 */
const generateStudentReport = ({ student, risk, attendance, marks }) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const RISK_COLORS = {
    high: '#dc2626', medium: '#ea580c',
    low: '#ca8a04', safe: '#16a34a',
  };
  const riskColor = RISK_COLORS[risk?.risk_level] || RISK_COLORS.safe;

  // ── Header ────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill('#0f172a');
  doc.fillColor('white')
    .fontSize(22).font('Helvetica-Bold')
    .text('PES Trust', 50, 25)
    .fontSize(11).font('Helvetica')
    .text('Student At-Risk Analysis System', 50, 52)
    .text(`Generated: ${new Date().toLocaleString()}`, 50, 68);

  // ── Student Info ──────────────────────────────────────────
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold')
    .text('Student Academic Report', 50, 110);

  doc.rect(50, 135, doc.page.width - 100, 1).fill('#e2e8f0');

  doc.fillColor('#334155').fontSize(11).font('Helvetica')
    .text(`Name:        ${student?.name || 'N/A'}`, 50, 145)
    .text(`Roll No:     ${student?.roll_no || 'N/A'}`, 50, 162)
    .text(`Department:  ${student?.dept_name || 'N/A'}`, 50, 179)
    .text(`Semester:    ${student?.semester || 'N/A'}`, 50, 196)
    .text(`Section:     ${student?.section || 'N/A'}`, 300, 145)
    .text(`Batch Year:  ${student?.batch_year || 'N/A'}`, 300, 162)
    .text(`Email:       ${student?.email || 'N/A'}`, 300, 179);

  // ── Risk Badge ────────────────────────────────────────────
  const riskLabel = (risk?.risk_level || 'safe').toUpperCase();
  doc.rect(50, 220, doc.page.width - 100, 50)
    .fill(riskColor + '22');
  doc.rect(50, 220, 4, 50).fill(riskColor);
  doc.fillColor(riskColor).fontSize(14).font('Helvetica-Bold')
    .text(`Risk Level: ${riskLabel}`, 65, 232);
  doc.fillColor('#475569').fontSize(10).font('Helvetica')
    .text(risk?.reason || 'Performance is within acceptable range', 65, 250);

  // ── Attendance Summary ────────────────────────────────────
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
    .text('Attendance Summary', 50, 290);
  doc.rect(50, 308, doc.page.width - 100, 1).fill('#e2e8f0');

  let y = 318;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b')
    .text('Subject', 50, y)
    .text('Present', 300, y)
    .text('Total', 370, y)
    .text('Percentage', 430, y);

  y += 16;
  doc.rect(50, y, doc.page.width - 100, 1).fill('#f1f5f9');
  y += 6;

  (attendance || []).forEach(a => {
    const color = a.pct < 60 ? '#dc2626' : a.pct < 75 ? '#ea580c' : a.pct < 85 ? '#ca8a04' : '#16a34a';
    doc.fillColor('#334155').font('Helvetica').fontSize(10)
      .text(a.subject || '', 50, y, { width: 240 })
      .text(String(a.present || 0), 300, y)
      .text(String(a.total || 0), 370, y);
    doc.fillColor(color).font('Helvetica-Bold')
      .text(`${a.pct || 0}%`, 430, y);
    y += 18;
    if (y > 700) { doc.addPage(); y = 50; }
  });

  // ── Marks Summary ─────────────────────────────────────────
  y += 10;
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
    .text('Marks Summary', 50, y);
  y += 18;
  doc.rect(50, y, doc.page.width - 100, 1).fill('#e2e8f0');
  y += 10;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b')
    .text('Subject', 50, y)
    .text('Exam Type', 270, y)
    .text('Obtained', 370, y)
    .text('Max', 430, y)
    .text('%', 480, y);

  y += 16;
  (marks || []).forEach(m => {
    const color = m.pct < 35 ? '#dc2626' : m.pct < 50 ? '#ea580c' : m.pct < 60 ? '#ca8a04' : '#16a34a';
    doc.fillColor('#334155').font('Helvetica').fontSize(10)
      .text(m.subject || '', 50, y, { width: 210 })
      .text(m.exam_type || '', 270, y)
      .text(String(m.marks_obtained || 0), 370, y)
      .text(String(m.max_marks || 0), 430, y);
    doc.fillColor(color).font('Helvetica-Bold')
      .text(`${m.pct || 0}%`, 480, y);
    y += 18;
    if (y > 700) { doc.addPage(); y = 50; }
  });

  // ── Footer ────────────────────────────────────────────────
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#0f172a');
  doc.fillColor('#64748b').fontSize(9).font('Helvetica')
    .text(
      `© ${new Date().getFullYear()} PES Trust Educational Institutions | Confidential`,
      50, doc.page.height - 26, { align: 'center', width: doc.page.width - 100 }
    );

  return doc;
};

module.exports = { generateStudentReport };
