const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const EmployeeSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true }, // ← ADD
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    role: {
      type: String,
      enum: ["manager", "cashier", "stock_keeper"],
      default: "cashier",
    },
    salary: { type: Number, required: true },
    joinDate: Date,
    address: String,
    cnic: String,
    username: { type: String, required: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    salaryStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    salaryHistory: [
      {
        amount: { type: Number, required: true },
        paidDate: { type: Date, default: Date.now },
        month: { type: String },
        status: { type: String, enum: ["paid", "pending"], default: "paid" },
      },
    ],
    lastPaidMonth: { type: String },
  },
  { timestamps: true },
);

// Username unique per tenant (not globally)
EmployeeSchema.index({ username: 1, tenantId: 1 }, { unique: true });

EmployeeSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

EmployeeSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
