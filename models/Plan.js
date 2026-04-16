const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["normal", "standard", "premium"],
      required: true,
      unique: true,
    },
    price: { type: Number, required: true },
    maxEmployees: { type: Number, default: null }, // null = unlimited
    maxProducts: { type: Number, default: null },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
