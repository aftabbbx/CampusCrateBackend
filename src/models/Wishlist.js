const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            ref: "User",
            required: true,
        },
        resource_id: {
            type: String,
            ref: "Resource",
            required: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate wishlist entries
wishlistSchema.index({ user_id: 1, resource_id: 1 }, { unique: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
