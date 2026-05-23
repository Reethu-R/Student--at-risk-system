/**
 * utils/excelParser.js
 * SheetJS-based Excel / CSV parser
 * Used by Bull.js queue workers
 */

const XLSX = require('xlsx');

/**
 * Parse an Excel or CSV file and return array of row objects
 * @param {string} filePath - absolute path to uploaded file
 * @returns {Array<Object>} parsed rows
 */
const parseExcel = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON — header row becomes keys
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',       // default empty string for missing cells
    raw: false,       // format dates as strings
  });

  return rows;
};

/**
 * Generate a sample attendance Excel template as Buffer
 */
const generateAttendanceTemplate = () => {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    { roll_no: 'CSE2024001', date: '2024-11-15', status: 'present' },
    { roll_no: 'CSE2024002', date: '2024-11-15', status: 'absent' },
    { roll_no: 'CSE2024003', date: '2024-11-15', status: 'present' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate a sample marks Excel template as Buffer
 */
const generateMarksTemplate = () => {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    { roll_no: 'CSE2024001', marks_obtained: 78, max_marks: 100 },
    { roll_no: 'CSE2024002', marks_obtained: 45, max_marks: 100 },
    { roll_no: 'CSE2024003', marks_obtained: 92, max_marks: 100 },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Marks');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { parseExcel, generateAttendanceTemplate, generateMarksTemplate };
