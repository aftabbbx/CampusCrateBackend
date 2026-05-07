const express = require('express');
const serverConfig = require('./config/server.config');
const connectDB = require('./config/db.config');

const app = express();

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(serverConfig.PORT, async () => {
    await connectDB();
    console.log(`Server is running on port ${serverConfig.PORT}`);
});