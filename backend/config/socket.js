/**
 * config/socket.js
 * Socket.io — real-time at-risk alerts to teachers & HODs
 * Rooms: faculty:{faculty_id}, student:{student_id}, dept:{dept_id}
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
// Track connected users: userId → socketId
const connectedUsers = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { user_id, role, department_id } = socket.user;
    connectedUsers.set(user_id, socket.id);

    // Join role-specific rooms
    socket.join(`user:${user_id}`);
    if (department_id) socket.join(`dept:${department_id}`);
    if (role === 'admin') socket.join('admin');

    console.log(`🔌 Socket connected: user ${user_id} (${role})`);

    socket.on('disconnect', () => {
      connectedUsers.delete(user_id);
      console.log(`🔌 Socket disconnected: user ${user_id}`);
    });
  });

  return io;
};

// Send alert to specific user
const notifyUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Send alert to entire department
const notifyDept = (deptId, event, data) => {
  if (!io) return;
  io.to(`dept:${deptId}`).emit(event, data);
};

// Broadcast to admins
const notifyAdmin = (event, data) => {
  if (!io) return;
  io.to('admin').emit(event, data);
};

const getIO = () => io;

module.exports = { initSocket, notifyUser, notifyDept, notifyAdmin, getIO };
