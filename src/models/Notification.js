const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const notificationSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        user_id: {
            type: String,
            ref: "User",
            required: true,
        },
        from_user_id: {
            type: String,
            ref: "User",
            default: null,
        },
        title: {
            type: String,
            trim: true,
        },
        message: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ["message", "follow", "verified", "request", "system"],
            default: "system",
        },
        is_read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// ─── Auto-generate custom _id before insert ──────────────────────────
notificationSchema.pre("save", async function () {
    if (this.isNew) {
        this._id = await generateCustomId("notification_seq", "NTF", "", 3);
    }
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
