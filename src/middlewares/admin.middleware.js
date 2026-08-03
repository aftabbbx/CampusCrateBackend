const jwt = require('jsonwebtoken');
const serverConfig = require('../config/server.config');
const User = require('../models/User');

const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No admin token provided.',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, serverConfig.JWT_SECRET);

        // Verify this is actually an admin user
        const admin = await User.findById(decoded.userId);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.',
            });
        }

        req.admin = decoded; // { userId, email, iat, exp }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Admin token expired. Please login again.',
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid admin token.',
        });
    }
};

module.exports = authenticateAdmin;
