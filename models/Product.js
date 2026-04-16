const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, sparse: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    supplier: { type: String, default: "" },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    stock: { type: Number, required: true, default: 0, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    minStockAlert: { type: Number, default: 10, min: 0 },
    image: { type: String, default: null },
  },
  { timestamps: true },
);

// SKU unique per tenant
productSchema.index({ sku: 1, tenantId: 1 }, { unique: true });
productSchema.index(
  { barcode: 1, tenantId: 1 },
  { unique: true, sparse: true },
);
productSchema.index({ name: "text", sku: "text" });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
