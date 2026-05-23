const mongoose = require('mongoose');
const serverConfig = require('./server.config');

const connectDB = async () => {
    try {
        if (!serverConfig.MONGO_URI) {
            console.error('MONGO_URI is not defined. Check your .env file.');
            process.exit(1);
        }
        await mongoose.connect(serverConfig.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        console.error('If you are a collaborator, make sure your IP is whitelisted in MongoDB Atlas.');
        console.error('Go to: MongoDB Atlas → Network Access → Add Current IP Address');
        process.exit(1);
    }
}

module.exports = connectDB;