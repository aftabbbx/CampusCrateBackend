import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
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
      type: mongoose.Schema.Types.ObjectId,
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

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;
