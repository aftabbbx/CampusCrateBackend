const express = require('express');
const cors = require('cors');
const serverConfig = require('./config/server.config');
const connectDB = require('./config/db.config');
const userRoutes = require('./routes/user.routes');

const app = express();

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

// ─── Start Server ────────────────────────────────────────────────────
app.listen(serverConfig.PORT, async () => {
    await connectDB();
    console.log(`Server is running on port ${serverConfig.PORT}`);
});