const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const serverConfig = require('./server.config');

// ─── Online Users Map: userId → socketId ────────────────────────────
const onlineUsers = new Map();

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // ─── JWT Auth Middleware for Socket ──────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, serverConfig.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    // ─── Connection Handler ─────────────────────────────────────────
    io.on('connection', (socket) => {
        const userId = socket.userId;
        onlineUsers.set(userId, socket.id);
        console.log(`🟢 User connected: ${userId} (socket: ${socket.id})`);

        // Broadcast online status
        io.emit('user-online', { userId });

        // ─── Send Message Event ─────────────────────────────────────
        socket.on('send-message', (data) => {
            const { receiver_id, message, _id, createdAt } = data;
            const receiverSocketId = onlineUsers.get(receiver_id);

            if (receiverSocketId) {
                // Receiver is online — deliver in real-time
                io.to(receiverSocketId).emit('receive-message', {
                    _id,
                    sender_id: userId,
                    receiver_id,
                    message,
                    is_read: false,
                    createdAt: createdAt || new Date(),
                });
            }
        });

        // ─── Typing Indicator ───────────────────────────────────────
        socket.on('typing', ({ receiver_id }) => {
            const receiverSocketId = onlineUsers.get(receiver_id);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user-typing', { userId });
            }
        });

        socket.on('stop-typing', ({ receiver_id }) => {
            const receiverSocketId = onlineUsers.get(receiver_id);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user-stop-typing', { userId });
            }
        });

        // ─── Mark Messages Read (real-time) ─────────────────────────
        socket.on('messages-read', ({ sender_id }) => {
            const senderSocketId = onlineUsers.get(sender_id);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messages-marked-read', { reader_id: userId });
            }
        });

        // ─── Disconnect ─────────────────────────────────────────────
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('user-offline', { userId });
            console.log(`🔴 User disconnected: ${userId}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initSocket first.');
    }
    return io;
};

const getOnlineUsers = () => onlineUsers;

module.exports = { initSocket, getIO, getOnlineUsers };
