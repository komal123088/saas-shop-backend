const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);
