const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "expired", "pending"],
      default: "pending",
    },
    planStartDate: { type: Date },
    planExpiry: { type: Date },
    tenantId: { type: String, unique: true },
    subdomain: { type: String, unique: true },
    tempPassword: { type: String }, // shown once after approval
    paymentHistory: [
      {
        amount: Number,
        date: Date,
        method: String,
        status: { type: String, enum: ["paid", "pending", "failed"] },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tenant", tenantSchema);
