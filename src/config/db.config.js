const mongoose = require('mongoose');
const serverConfig = require('./server.config');

const connectDB = async () => {
    try {
        await mongoose.connect(serverConfig.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

module.exports = connectDB;