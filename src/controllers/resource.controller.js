const Resource = require('../models/Resource');

// ─── CREATE RESOURCE ────────────────────────────────────────────────
const createResource = async (req, res) => {
    try {
        const { title, description, category, type, price, condition, image_url, location } = req.body;

        if (!title || !description || !category || !type || !condition) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, category, type, and condition are required',
            });
        }

        const resource = await Resource.create({
            title,
            description,
            category,
            type,
            price: price || 0,
            condition,
            image_url,
            location,
            owner_id: req.user.userId,
            status: 'Available',
        });

        return res.status(201).json({
            success: true,
            message: 'Resource created successfully',
            resource,
        });
    } catch (error) {
        console.error('Create resource error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET ALL RESOURCES ──────────────────────────────────────────────
const getAllResources = async (req, res) => {
    try {
        const resources = await Resource.find({ status: 'Available' })
            .populate('owner_id', 'name username email profile_image semester')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: resources.length, resources });
    } catch (error) {
        console.error('Get all resources error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET RESOURCE BY ID ─────────────────────────────────────────────
const getResourceById = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate('owner_id', 'name username email profile_image semester bio');

        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        return res.status(200).json({ success: true, resource });
    } catch (error) {
        console.error('Get resource by ID error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET MY RESOURCES ───────────────────────────────────────────────
const getMyResources = async (req, res) => {
    try {
        const resources = await Resource.find({ owner_id: req.user.userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: resources.length, resources });
    } catch (error) {
        console.error('Get my resources error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── UPDATE RESOURCE ────────────────────────────────────────────────
const updateResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (resource.owner_id.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You can only edit your own resources.' });
        }

        const { title, description, category, type, price, condition, image_url, location, status } = req.body;

        if (title) resource.title = title;
        if (description) resource.description = description;
        if (category) resource.category = category;
        if (type) resource.type = type;
        if (price !== undefined) resource.price = price;
        if (condition) resource.condition = condition;
        if (image_url !== undefined) resource.image_url = image_url;
        if (location !== undefined) resource.location = location;
        if (status) resource.status = status;

        await resource.save();

        return res.status(200).json({
            success: true,
            message: 'Resource updated successfully',
            resource,
        });
    } catch (error) {
        console.error('Update resource error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── DELETE RESOURCE ────────────────────────────────────────────────
const deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (resource.owner_id.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You can only delete your own resources.' });
        }

        await Resource.findByIdAndDelete(req.params.id);

        return res.status(200).json({ success: true, message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Delete resource error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── SEARCH RESOURCES ───────────────────────────────────────────────
const searchResources = async (req, res) => {
    try {
        const { keyword, category, type, condition } = req.query;
        const filter = { status: 'Available' };

        if (keyword) {
            filter.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
            ];
        }
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (condition) filter.condition = condition;

        const resources = await Resource.find(filter)
            .populate('owner_id', 'name username email profile_image')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: resources.length, resources });
    } catch (error) {
        console.error('Search resources error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    createResource,
    getAllResources,
    getResourceById,
    getMyResources,
    updateResource,
    deleteResource,
    searchResources,
};
