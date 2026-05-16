const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Request = require('../models/Request');
const serverConfig = require('../config/server.config');

// ─── ADMIN LOGIN ────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        const token = jwt.sign(
            { adminId: admin._id, email: admin.email, role: admin.role },
            serverConfig.JWT_SECRET,
            { expiresIn: serverConfig.JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalResources, totalDeals, availableResources, pendingRequests] = await Promise.all([
            User.countDocuments({ is_verified: true }),
            Resource.countDocuments(),
            Request.countDocuments({ status: 'Completed' }),
            Resource.countDocuments({ status: 'Available' }),
            Request.countDocuments({ status: 'Pending' }),
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalResources,
                totalDeals,
                availableResources,
                pendingRequests,
            },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET ALL USERS (Admin) ──────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -otp -otp_expires_at')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Admin get all users error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── DELETE USER (Admin) ────────────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Also clean up user's resources and requests
        await Resource.deleteMany({ owner_id: req.params.id });
        await Request.deleteMany({ $or: [{ sender_id: req.params.id }, { receiver_id: req.params.id }] });

        return res.status(200).json({ success: true, message: 'User and associated data deleted' });
    } catch (error) {
        console.error('Admin delete user error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET ALL RESOURCES (Admin) ──────────────────────────────────────
const getAllResources = async (req, res) => {
    try {
        const resources = await Resource.find()
            .populate('owner_id', 'name username email')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: resources.length, resources });
    } catch (error) {
        console.error('Admin get all resources error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── DELETE RESOURCE (Admin) ────────────────────────────────────────
const deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        // Clean up requests for this resource
        await Request.deleteMany({ resource_id: req.params.id });

        return res.status(200).json({ success: true, message: 'Resource and associated requests deleted' });
    } catch (error) {
        console.error('Admin delete resource error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET ALL DEALS (Completed Requests) ─────────────────────────────
const getAllDeals = async (req, res) => {
    try {
        const deals = await Request.find({ status: 'Completed' })
            .populate('resource_id', 'title category type price')
            .populate('sender_id', 'name username email')
            .populate('receiver_id', 'name username email')
            .sort({ updatedAt: -1 });

        return res.status(200).json({ success: true, count: deals.length, deals });
    } catch (error) {
        console.error('Admin get all deals error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    deleteUser,
    getAllResources,
    deleteResource,
    getAllDeals,
};
