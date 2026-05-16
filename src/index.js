const express = require('express');
const http = require('http');
const cors = require('cors');
const serverConfig = require('./config/server.config');
const connectDB = require('./config/db.config');
const { initSocket } = require('./config/socket.config');
const userRoutes = require('./routes/user.routes');
const resourceRoutes = require('./routes/resource.routes');
const requestRoutes = require('./routes/request.routes');
const messageRoutes = require('./routes/message.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.io Init ─────────────────────────────────────────────────
const io = initSocket(server);

// ─── Middlewares ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────
app.get('/ping', (req, res) => {
    res.send('pong');
});

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/user', userRoutes);
app.use('/resource', resourceRoutes);
app.use('/request', requestRoutes);
app.use('/message', messageRoutes);
app.use('/notification', notificationRoutes);
app.use('/admin', adminRoutes);

// ─── Start Server ────────────────────────────────────────────────────
server.listen(serverConfig.PORT, async () => {
    await connectDB();
    console.log(`🚀 Server is running on port ${serverConfig.PORT}`);
    console.log(`⚡ Socket.io ready for real-time connections`);
});