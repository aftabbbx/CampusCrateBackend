const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO, getOnlineUsers } = require('../config/socket.config');

// ─── SEND MESSAGE ───────────────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {
        const { receiver_id, message } = req.body;

        if (!receiver_id || !message) {
            return res.status(400).json({ success: false, message: 'Receiver ID and message are required' });
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
            message,
            is_read: false,
        });

        // ─── Real-time delivery via Socket.io ───────────────────────
        try {
            const io = getIO();
            const onlineUsers = getOnlineUsers();
            const receiverSocketId = onlineUsers.get(receiver_id);

            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive-message', {
                    _id: newMessage._id,
                    sender_id: req.user.userId,
                    receiver_id,
                    message: newMessage.message,
                    is_read: false,
                    createdAt: newMessage.createdAt,
                });
            }
        } catch (socketErr) {
            // Socket emit fail hone pe bhi REST response toh jayega
            console.error('Socket emit error:', socketErr.message);
        }

        // Auto-notification to receiver
        await Notification.create({
            user_id: receiver_id,
            title: 'New Message',
            message: 'You have a new message',
            type: 'message',
        });

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
            .populate('sender_id', 'name username profile_image')
            .populate('receiver_id', 'name username profile_image');

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
        const mongoose = require('mongoose');
        const myObjectId = mongoose.Types.ObjectId.createFromHexString(myId);

        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender_id: myObjectId },
                        { receiver_id: myObjectId },
                    ],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender_id', myObjectId] },
                            '$receiver_id',
                            '$sender_id',
                        ],
                    },
                    lastMessage: { $first: '$message' },
                    lastMessageAt: { $first: '$createdAt' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver_id', myObjectId] },
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
        const users = await User.find({ _id: { $in: userIds } }).select('name username email profile_image');

        // Add online status
        const onlineUsers = getOnlineUsers();

        const conversations = messages.map((m) => {
            const user = users.find((u) => u._id.toString() === m._id.toString());
            return {
                user,
                lastMessage: m.lastMessage,
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

        // Notify sender via socket that messages were read
        try {
            const io = getIO();
            const onlineUsers = getOnlineUsers();
            const senderSocketId = onlineUsers.get(otherUserId);

            if (senderSocketId) {
                io.to(senderSocketId).emit('messages-marked-read', { reader_id: myId });
            }
        } catch (socketErr) {
            console.error('Socket emit error:', socketErr.message);
        }

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
