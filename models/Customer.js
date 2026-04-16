const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, sparse: true },
    email: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    address: String,
    cnic: String,
    creditLimit: { type: Number, default: 50000 },
    dueDate: Date,
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingDue: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Phone unique per tenant
CustomerSchema.index({ phone: 1, tenantId: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
