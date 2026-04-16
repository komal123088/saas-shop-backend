const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: String,
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Location || mongoose.model("Location", LocationSchema);
