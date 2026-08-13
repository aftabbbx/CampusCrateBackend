const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const serverConfig = require('./config/server.config');
const connectDB = require('./config/db.config');
const { initSocket } = require('./config/socket.config');
const userRoutes = require('./routes/user.routes');
const resourceRoutes = require('./routes/resource.routes');
const requestRoutes = require('./routes/request.routes');
const messageRoutes = require('./routes/message.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const wishlistRoutes = require('./routes/wishlist.routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.io Init ─────────────────────────────────────────────────
const io = initSocket(server);

// ─── Middlewares ─────────────────────────────────────────────────────
app.use(compression());

const allowedOrigins = [
    'https://campus-crate-ui.vercel.app',
    'http://localhost:5173',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/upload', uploadRoutes);
app.use('/wishlist', wishlistRoutes);

// ─── Start Server ────────────────────────────────────────────────────
server.listen(serverConfig.PORT, async () => {
    console.log(`Server is running on port ${serverConfig.PORT}`);
    console.log(`ENV loaded from: ${require('path').resolve(__dirname, '../.env')}`);
    console.log(`MONGO_URI: ${serverConfig.MONGO_URI ? 'Set' : 'NOT SET'}`);
    console.log(`JWT_SECRET: ${serverConfig.JWT_SECRET ? 'Set' : 'NOT SET'}`);
    console.log(`CLOUDINARY: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'NOT SET'}`);
    await connectDB();
    console.log(`Socket.io ready for real-time connections`);
});