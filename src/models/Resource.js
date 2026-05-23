const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const resourceSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },
        category: {
            type: String,
            enum: ["Book", "Notes", "Stationery", "Project", "Other"],
            required: true,
        },
        type: {
            type: String,
            enum: ["Free", "Paid", "Exchange"],
            required: true,
        },
        price: {
            type: Number,
            default: 0,
            min: 0,
        },
        condition: {
            type: String,
            enum: ["New", "Used"],
            required: true,
        },
        image_url: {
            type: String,
        },
        location: {
            type: String,
            trim: true,
        },
        owner_id: {
            type: String,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["Available", "Pending", "Exchanged"],
            default: "Available",
        },
    },
    { timestamps: true }
);

// ─── Auto-generate custom _id before insert ──────────────────────────
resourceSchema.pre("save", async function () {
    if (this.isNew) {
        this._id = await generateCustomId("resource_seq", "RSC", "", 3);
    }
});

const Resource = mongoose.model("Resource", resourceSchema);
module.exports = Resource;
