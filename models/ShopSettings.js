const mongoose = require("mongoose");

const ShopSettingsSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true }, // ek tenant ki ek setting
    shopName: { type: String, default: "My Shop" },
    address: { type: String, default: "Main Bazar, City" },
    location: { type: String, default: "Lahore, Punjab" },
    phone: { type: String, default: "03xx-xxxxxxx" },
    whatsapp: { type: String, default: "" },
    email: { type: String, default: "" },
    about: { type: String, default: "" },
    logo: { type: String, default: "" },
    theme: {
      mode: { type: String, enum: ["light", "dark"], default: "light" },
      primary: { type: String, default: "#0d6efd" },
      secondary: { type: String, default: "#6c757d" },
    },
  },
  { timestamps: true },
);

// getInstance ab tenantId leta hai
ShopSettingsSchema.statics.getInstance = async function (tenantId) {
  let settings = await this.findOne({ tenantId });
  if (!settings) {
    settings = await this.create({ tenantId });
  }
  return settings;
};

module.exports =
  mongoose.models.ShopSettings ||
  mongoose.model("ShopSettings", ShopSettingsSchema);
