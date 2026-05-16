const Notification = require('../models/Notification');

// ─── GET ALL NOTIFICATIONS ──────────────────────────────────────────
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user.userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: notifications.length, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET UNREAD COUNT ───────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            user_id: req.user.userId,
            is_read: false,
        });

        return res.status(200).json({ success: true, unreadCount: count });
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── MARK SINGLE AS READ ───────────────────────────────────────────
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.userId },
            { is_read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({ success: true, message: 'Marked as read', notification });
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── MARK ALL AS READ ───────────────────────────────────────────────
const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user.userId, is_read: false },
            { is_read: true }
        );

        return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
};
