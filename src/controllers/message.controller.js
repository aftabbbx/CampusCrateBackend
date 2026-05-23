const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ─── SEND MESSAGE ───────────────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {
        const { receiver_id, message, message_type, media_url } = req.body;

        if (!receiver_id) {
            return res.status(400).json({ success: false, message: 'Receiver ID is required' });
        }

        // Validate based on message type
        const type = message_type || 'text';
        if (type === 'text' && (!message || !message.trim())) {
            return res.status(400).json({ success: false, message: 'Message text is required' });
        }
        if ((type === 'image' || type === 'voice') && !media_url) {
            return res.status(400).json({ success: false, message: 'Media URL is required for image/voice messages' });
        }

        if (receiver_id === req.user.userId) {
            return res.status(400).json({ success: false, message: 'You cannot message yourself' });
        }

        const receiver = await User.findById(receiver_id);
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        const newMessage = await Message.create({
            sender_id: req.user.userId,
            receiver_id,
            message: message || '',
            message_type: type,
            media_url: media_url || null,
            is_read: false,
        });

        // ─── Smart Notification: Only on FIRST message in conversation ──
        const previousMessages = await Message.countDocuments({
            $or: [
                { sender_id: req.user.userId, receiver_id },
                { sender_id: receiver_id, receiver_id: req.user.userId },
            ],
            _id: { $ne: newMessage._id },
        });

        if (previousMessages === 0) {
            // First ever message between these two users
            const sender = await User.findById(req.user.userId).select('name');
            await Notification.create({
                user_id: receiver_id,
                from_user_id: req.user.userId,
                title: 'New Message',
                message: `${sender?.name || 'Someone'} sent you a message`,
                type: 'message',
            });
        }

        // NOTE: Socket emit is handled by the frontend via socket.emit('send-message')
        // No duplicate emit from controller needed

        return res.status(201).json({ success: true, message: 'Message sent', data: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET CONVERSATION WITH A USER ───────────────────────────────────
const getConversation = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const myId = req.user.userId;

        const messages = await Message.find({
            $or: [
                { sender_id: myId, receiver_id: otherUserId },
                { sender_id: otherUserId, receiver_id: myId },
            ],
        })
            .sort({ createdAt: 1 })
            .populate('sender_id', 'name profile_image')
            .populate('receiver_id', 'name profile_image');

        return res.status(200).json({ success: true, count: messages.length, messages });
    } catch (error) {
        console.error('Get conversation error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET CONVERSATION LIST (all users I've chatted with) ────────────
const getConversationList = async (req, res) => {
    try {
        const myId = req.user.userId;

        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender_id: myId },
                        { receiver_id: myId },
                    ],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender_id', myId] },
                            '$receiver_id',
                            '$sender_id',
                        ],
                    },
                    lastMessage: { $first: '$message' },
                    lastMessageType: { $first: '$message_type' },
                    lastMessageAt: { $first: '$createdAt' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver_id', myId] },
                                        { $eq: ['$is_read', false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { lastMessageAt: -1 } },
        ]);

        // Populate user info
        const userIds = messages.map((m) => m._id);
        const users = await User.find({ _id: { $in: userIds } }).select('name email profile_image last_active roll_number');

        // Add online status
        const { getOnlineUsers } = require('../config/socket.config');
        let onlineUsers;
        try {
            onlineUsers = getOnlineUsers();
        } catch (e) {
            onlineUsers = new Map();
        }

        const conversations = messages.map((m) => {
            const user = users.find((u) => u._id.toString() === m._id.toString());
            return {
                user,
                lastMessage: m.lastMessageType === 'image' ? '📷 Photo' : m.lastMessageType === 'voice' ? '🎙️ Voice note' : m.lastMessage,
                lastMessageType: m.lastMessageType,
                lastMessageAt: m.lastMessageAt,
                unreadCount: m.unreadCount,
                isOnline: onlineUsers.has(m._id.toString()),
            };
        });

        return res.status(200).json({ success: true, count: conversations.length, conversations });
    } catch (error) {
        console.error('Get conversation list error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── MARK MESSAGES AS READ ──────────────────────────────────────────
const markAsRead = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const myId = req.user.userId;

        await Message.updateMany(
            { sender_id: otherUserId, receiver_id: myId, is_read: false },
            { is_read: true }
        );

        return res.status(200).json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getConversationList,
    markAsRead,
};
