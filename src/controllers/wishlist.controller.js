const Wishlist = require("../models/Wishlist");
const Resource = require("../models/Resource");

// ─── Toggle wishlist (add/remove) ────────────────────────────────────
const toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { resourceId } = req.params;

        // Check resource exists
        const resource = await Resource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found." });
        }

        // Don't allow wishlisting own resource
        if (resource.owner_id === userId) {
            return res.status(400).json({ success: false, message: "You cannot wishlist your own resource." });
        }

        // Check if already wishlisted
        const existing = await Wishlist.findOne({ user_id: userId, resource_id: resourceId });

        if (existing) {
            await Wishlist.deleteOne({ _id: existing._id });
            return res.json({ success: true, wishlisted: false, message: "Removed from wishlist." });
        } else {
            await Wishlist.create({ user_id: userId, resource_id: resourceId });
            return res.json({ success: true, wishlisted: true, message: "Added to wishlist." });
        }
    } catch (error) {
        console.error("Toggle wishlist error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─── Get user's wishlist ─────────────────────────────────────────────
const getWishlist = async (req, res) => {
    try {
        const userId = req.user.userId;

        const items = await Wishlist.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .lean();

        // Populate resource data
        const resourceIds = items.map((i) => i.resource_id);
        const resources = await Resource.find({ _id: { $in: resourceIds } })
            .populate("owner_id", "name profile_image roll_number course")
            .lean();

        // Merge and maintain order
        const resourceMap = {};
        resources.forEach((r) => (resourceMap[r._id] = r));

        const wishlist = items
            .map((item) => ({
                ...item,
                resource: resourceMap[item.resource_id] || null,
            }))
            .filter((item) => item.resource !== null);

        return res.json({ success: true, wishlist, count: wishlist.length });
    } catch (error) {
        console.error("Get wishlist error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─── Check if resource is wishlisted ─────────────────────────────────
const checkWishlist = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { resourceId } = req.params;

        const exists = await Wishlist.findOne({ user_id: userId, resource_id: resourceId });
        return res.json({ success: true, wishlisted: !!exists });
    } catch (error) {
        console.error("Check wishlist error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─── Get all wishlisted resource IDs ─────────────────────────────────
const getWishlistIds = async (req, res) => {
    try {
        const userId = req.user.userId;
        const items = await Wishlist.find({ user_id: userId }).select("resource_id").lean();
        const ids = items.map((i) => i.resource_id);
        return res.json({ success: true, ids });
    } catch (error) {
        console.error("Get wishlist IDs error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

module.exports = { toggleWishlist, getWishlist, checkWishlist, getWishlistIds };
