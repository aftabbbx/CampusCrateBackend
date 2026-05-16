const jwt = require('jsonwebtoken');
const serverConfig = require('../config/server.config');
const Admin = require('../models/Admin');

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

        // Verify this is actually an admin
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin not found.',
            });
        }

        req.admin = decoded; // { adminId, email, role, iat, exp }
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
