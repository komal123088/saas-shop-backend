const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "success",
        "error",
        "warning",
        "info",
        "low-stock",
        "new-credit",
        "employee-added",
        "salary-paid",
        "credit-due",
      ],
      required: true,
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
    emailData: { type: Object },
    sendEmail: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
