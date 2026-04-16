const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const OwnerSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true }, // ← ADD
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: String,
    shopName: String,
    isOwner: { type: Boolean, default: true },
    isRegistered: { type: Boolean, default: false },
    resetPasswordCode: String,
    resetPasswordExpires: Date,
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Email unique per tenant (not globally)
OwnerSchema.index({ email: 1, tenantId: 1 }, { unique: true });

OwnerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

OwnerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.Owner || mongoose.model("Owner", OwnerSchema);
