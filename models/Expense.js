const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "salary",
        "purchase",
        "utility",
        "office",
        "food",
        "transport",
        "other",
      ],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    employee: { type: String },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "credit"],
      default: "cash",
    },
    notes: String,
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
