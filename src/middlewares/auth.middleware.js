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
        
        // Real-time check to see if user is suspended or deleted
        const User = require('../models/User');
        User.findById(decoded.userId).then(user => {
            if (!user) {
                return res.status(401).json({ success: false, message: 'User account no longer exists.' });
            }
            if (user.is_suspended) {
                return res.status(401).json({ success: false, message: 'Your account has been suspended.' });
            }
            req.user = decoded; // { userId, email, iat, exp }
            next();
        }).catch(err => {
            console.error('Auth middleware DB error:', err);
            return res.status(500).json({ success: false, message: 'Server error during authentication.' });
        });
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
