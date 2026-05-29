const Notification = require('../models/Notification');

/**
 * Create a notification in DB and emit it in real-time via Socket.IO.
 * @param {Object} data - Notification data
 * @param {string} data.user_id - Target user ID (who receives the notification)
 * @param {string} [data.from_user_id] - Source user ID (who triggered it)
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification body
 * @param {string} data.type - Notification type (follow, request, deal, system, etc.)
 */
const emitNotification = async ({ user_id, from_user_id, title, message, type }) => {
    // 1. Save to database
    const notification = await Notification.create({
        user_id,
        from_user_id,
        title,
        message,
        type,
    });

    // 2. Emit via socket if user is online
    try {
        const { getIO, getOnlineUsers } = require('../config/socket.config');
        const targetSocketId = getOnlineUsers().get(user_id);
        if (targetSocketId) {
            getIO().to(targetSocketId).emit('new-notification', {
                _id: notification._id,
                type,
                from: from_user_id || null,
                title,
                message,
                createdAt: notification.createdAt,
            });
        }
    } catch (err) {
        // Socket not critical — notification is already saved in DB
        console.error('Socket emit error (non-critical):', err.message);
    }

    return notification;
};

module.exports = emitNotification;
