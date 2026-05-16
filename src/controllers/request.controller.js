const Request = require('../models/Request');
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');

// ─── SEND REQUEST ───────────────────────────────────────────────────
const sendRequest = async (req, res) => {
    try {
        const { resource_id, message } = req.body;

        if (!resource_id) {
            return res.status(400).json({ success: false, message: 'Resource ID is required' });
        }

        const resource = await Resource.findById(resource_id);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (resource.status !== 'Available') {
            return res.status(400).json({ success: false, message: 'Resource is not available' });
        }

        if (resource.owner_id.toString() === req.user.userId) {
            return res.status(400).json({ success: false, message: 'You cannot request your own resource' });
        }

        // Check if already requested
        const existingRequest = await Request.findOne({
            resource_id,
            sender_id: req.user.userId,
            status: { $in: ['Pending', 'Accepted'] },
        });

        if (existingRequest) {
            return res.status(409).json({ success: false, message: 'You already have an active request for this resource' });
        }

        const newRequest = await Request.create({
            resource_id,
            sender_id: req.user.userId,
            receiver_id: resource.owner_id,
            message: message || '',
            status: 'Pending',
        });

        // Auto-notification to resource owner
        await Notification.create({
            user_id: resource.owner_id,
            title: 'New Request',
            message: `Someone requested your resource "${resource.title}"`,
            type: 'request',
        });

        return res.status(201).json({
            success: true,
            message: 'Request sent successfully',
            request: newRequest,
        });
    } catch (error) {
        console.error('Send request error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET RECEIVED REQUESTS ──────────────────────────────────────────
const getReceivedRequests = async (req, res) => {
    try {
        const requests = await Request.find({ receiver_id: req.user.userId })
            .populate('resource_id', 'title category type price image_url status')
            .populate('sender_id', 'name username email profile_image')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: requests.length, requests });
    } catch (error) {
        console.error('Get received requests error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET SENT REQUESTS ──────────────────────────────────────────────
const getSentRequests = async (req, res) => {
    try {
        const requests = await Request.find({ sender_id: req.user.userId })
            .populate('resource_id', 'title category type price image_url status')
            .populate('receiver_id', 'name username email profile_image')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: requests.length, requests });
    } catch (error) {
        console.error('Get sent requests error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── ACCEPT REQUEST ─────────────────────────────────────────────────
const acceptRequest = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.receiver_id.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only the resource owner can accept.' });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Cannot accept a request with status "${request.status}"` });
        }

        request.status = 'Accepted';
        await request.save();

        // Lock the resource
        await Resource.findByIdAndUpdate(request.resource_id, { status: 'Pending' });

        // Reject all other pending requests for this resource
        await Request.updateMany(
            { resource_id: request.resource_id, _id: { $ne: request._id }, status: 'Pending' },
            { status: 'Rejected' }
        );

        // Notification to sender
        await Notification.create({
            user_id: request.sender_id,
            title: 'Request Accepted',
            message: 'Your request has been accepted! You can now chat with the owner.',
            type: 'request',
        });

        return res.status(200).json({ success: true, message: 'Request accepted successfully', request });
    } catch (error) {
        console.error('Accept request error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── REJECT REQUEST ─────────────────────────────────────────────────
const rejectRequest = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.receiver_id.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only the resource owner can reject.' });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Cannot reject a request with status "${request.status}"` });
        }

        request.status = 'Rejected';
        await request.save();

        // Notification to sender
        await Notification.create({
            user_id: request.sender_id,
            title: 'Request Rejected',
            message: 'Your request has been rejected.',
            type: 'request',
        });

        return res.status(200).json({ success: true, message: 'Request rejected', request });
    } catch (error) {
        console.error('Reject request error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── COMPLETE REQUEST (Deal Done) ───────────────────────────────────
const completeRequest = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.receiver_id.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only the resource owner can complete.' });
        }

        if (request.status !== 'Accepted') {
            return res.status(400).json({ success: false, message: 'Only accepted requests can be completed' });
        }

        request.status = 'Completed';
        await request.save();

        // Mark resource as Exchanged
        await Resource.findByIdAndUpdate(request.resource_id, { status: 'Exchanged' });

        // Notification to both users
        await Notification.create({
            user_id: request.sender_id,
            title: 'Deal Completed',
            message: 'The exchange has been completed successfully! 🎉',
            type: 'deal',
        });

        await Notification.create({
            user_id: request.receiver_id,
            title: 'Deal Completed',
            message: 'You have successfully completed the exchange! 🎉',
            type: 'deal',
        });

        return res.status(200).json({ success: true, message: 'Deal completed successfully', request });
    } catch (error) {
        console.error('Complete request error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    sendRequest,
    getReceivedRequests,
    getSentRequests,
    acceptRequest,
    rejectRequest,
    completeRequest,
};
