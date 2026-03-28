const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Join personal room
    socket.join(`user_${socket.user._id}`);

    // Join role-based room
    socket.join(`role_${socket.user.role}`);

    // Customer: Track specific order
    socket.on('track_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`📦 ${socket.user.name} tracking order ${orderId}`);
    });

    socket.on('untrack_order', (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    // Delivery partner: Join delivery room
    if (socket.user.role === 'delivery') {
      socket.join(`delivery_${socket.user._id}`);
    }

    // Admin: Join admin room
    if (socket.user.role === 'admin') {
      socket.join('admin_room');
    }

    // Delivery partner location update
    socket.on('location_update', async ({ latitude, longitude, orderId }) => {
      if (socket.user.role !== 'delivery') return;

      // Broadcast to order tracking room
      if (orderId) {
        io.to(`order_${orderId}`).emit('delivery_location_update', {
          latitude,
          longitude,
          deliveryPartnerId: socket.user._id,
          timestamp: new Date(),
        });
      }

      // Update in admin room
      io.to('admin_room').emit('partner_location_update', {
        partnerId: socket.user._id,
        partnerName: socket.user.name,
        latitude,
        longitude,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
