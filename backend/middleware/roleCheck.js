/**
 * middleware/roleCheck.js
 * Role-based access control — granular permission matrix
 */

/**
 * Factory: returns middleware that allows only specified roles
 * @param {string|string[]} allowedRoles
 */
const checkRole = (allowedRoles) => (req, res, next) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

// Named middleware exports per permission matrix
const isAdmin      = checkRole('admin');
const isHOD        = checkRole('hod');
const isTeacher    = checkRole('teacher');
const isStudent    = checkRole('student');
const isFaculty    = checkRole(['hod', 'teacher']);
const isAdminOrHOD = checkRole(['admin', 'hod']);
const isStaff      = checkRole(['admin', 'hod', 'teacher']);

module.exports = {
  checkRole,
  isAdmin,
  isHOD,
  isTeacher,
  isStudent,
  isFaculty,
  isAdminOrHOD,
  isStaff,
};
