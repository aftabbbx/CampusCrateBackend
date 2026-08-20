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
        // Allow all Vercel preview deployments for this project
        if (origin.endsWith('.vercel.app') && origin.includes('campus-crate')) {
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

// ─── Diagnostics (check env vars on deployed server) ─────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        env: {
            MONGO_URI: !!process.env.MONGO_URI,
            JWT_SECRET: !!process.env.JWT_SECRET,
            SMTP_HOST: !!process.env.SMTP_HOST,
            SMTP_PORT: !!process.env.SMTP_PORT,
            SMTP_USER: !!process.env.SMTP_USER,
            SMTP_PASS: !!process.env.SMTP_PASS,
            SMTP_FROM_EMAIL: !!process.env.SMTP_FROM_EMAIL,
            CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        },
    });
});

// ─── Test Email (temporary debug — remove after fixing) ──────────────
app.get('/test-email', async (req, res) => {
    try {
        const { transporter } = require('./config/email.config');
        // Just verify the SMTP connection
        await transporter.verify();
        res.json({ success: true, message: 'SMTP connection verified successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'SMTP connection failed',
            error: error.message,
            code: error.code,
        });
    }
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