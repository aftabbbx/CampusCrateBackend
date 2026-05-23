const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const messageSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        sender_id: {
            type: String,
            ref: "User",
            required: true,
        },
        receiver_id: {
            type: String,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            trim: true,
            default: "",
        },
        message_type: {
            type: String,
            enum: ["text", "image", "voice"],
            default: "text",
        },
        media_url: {
            type: String,
            default: null,
        },
        is_read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// ─── Auto-generate custom _id before insert ──────────────────────────
messageSchema.pre("save", async function () {
    if (this.isNew) {
        this._id = await generateCustomId("message_seq", "MSG", "", 3);
    }
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
