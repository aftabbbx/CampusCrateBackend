const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const requestSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        resource_id: {
            type: String,
            ref: "Resource",
            required: true,
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
        status: {
            type: String,
            enum: ["Pending", "Accepted", "Rejected", "Completed"],
            default: "Pending",
        },
        message: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

// ─── Auto-generate custom _id before insert ──────────────────────────
requestSchema.pre("save", async function () {
    if (this.isNew) {
        this._id = await generateCustomId("request_seq", "REQ", "", 3);
    }
});

const Request = mongoose.model("Request", requestSchema);
module.exports = Request;
