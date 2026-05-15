const jwt = require('jsonwebtoken');
const serverConfig = require('../config/server.config');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, serverConfig.JWT_SECRET);
        req.user = decoded; // { userId, email, iat, exp }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token.',
        });
    }
};

module.exports = authenticate;
