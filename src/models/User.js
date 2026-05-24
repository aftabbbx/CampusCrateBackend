const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const userSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        roll_number: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
        },
        phone_number: {
            type: String,
            trim: true,
        },
        profile_image: {
            type: String,
        },
        course: {
            type: String,
            enum: ["BCA", "BBA", "BCom", "BSc", "BA", "BTech", "MBA", "MCA", "MCom", "MSc", "Other"],
            trim: true,
        },
        batch: {
            type: String,
            trim: true,
        },
        semester: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        trust_score: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        followers: [
            {
                type: String,
                ref: "User",
            },
        ],
        following: [
            {
                type: String,
                ref: "User",
            },
        ],
        is_verified: {
            type: Boolean,
            default: false,
        },
        is_college_verified: {
            type: Boolean,
            default: false,
        },
        last_active: {
            type: Date,
            default: Date.now,
        },
        otp: {
            type: String,
        },
        otp_expires_at: {
            type: Date,
        },
        is_suspended: {
            type: Boolean,
            default: false,
        },
        suspended_at: {
            type: Date,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ─── Virtual: Profile completeness check ──────────────────────────────
userSchema.virtual("is_profile_complete").get(function () {
    return !!(
        this.roll_number && String(this.roll_number).trim() !== "" &&
        this.course && String(this.course).trim() !== "" &&
        this.batch && String(this.batch).trim() !== "" &&
        this.semester && String(this.semester).trim() !== ""
    );
});

// ─── Auto-generate custom _id before insert ──────────────────────────
userSchema.pre("save", async function () {
    if (this.isNew) {
        const roleCode = this.role === "admin" ? "AD" : "US";
        this._id = await generateCustomId("user_seq", "USR", roleCode, 3);
    }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
