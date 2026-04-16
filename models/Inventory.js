const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    supplierPhone: { type: String, trim: true, default: "" },
    itemDescription: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "Piece" },
    purchasePrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0 },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

inventorySchema.pre("save", function () {
  this.totalAmount = Number(this.quantity) * Number(this.purchasePrice);
  this.remainingAmount = this.totalAmount - Number(this.amountPaid);
});

module.exports =
  mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema);
