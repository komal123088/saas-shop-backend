const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const ShopSettings = require("../models/ShopSettings");
const { sendEmail } = require("../services/emailService");
const { tenantAuth } = require("../middleware/tenantAuth");

const EMAIL_TYPES = [
  "low-stock",
  "new-credit",
  "employee-added",
  "salary-paid",
  "credit-due",
];

router.use(tenantAuth);

// ============================================
// POST new notification
// ============================================
router.post("/", async (req, res) => {
  try {
    const { type, message, emailData } = req.body;

    if (!type || !message) {
      return res.status(400).json({ message: "Type and message required" });
    }

    const shouldSendEmail = EMAIL_TYPES.includes(type);

    const notification = new Notification({
      tenantId: req.tenantId, // ← ADD
      type,
      message,
      isRead: false,
      timestamp: new Date(),
      sendEmail: shouldSendEmail,
      emailData: emailData || {},
      emailSent: false,
    });

    const saved = await notification.save();

    // Email send karo agar required hai
    if (shouldSendEmail) {
      const shopSettings = await ShopSettings.getInstance(req.tenantId);
      const ownerEmail = shopSettings?.email;

      if (ownerEmail) {
        const emailResult = await sendEmail(ownerEmail, type, emailData || {});
        saved.emailSent = emailResult.success;
        await saved.save();
      }
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error("POST notification error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// GET all notifications — sirf is tenant ki
// ============================================
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ tenantId: req.tenantId }) // ← ADD
      .sort({ timestamp: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("GET notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// PATCH mark all as read — sirf is tenant ki
// ============================================
router.patch("/mark-all-read", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { tenantId: req.tenantId, isRead: false }, // ← ADD
      { $set: { isRead: true } },
    );

    res.json({
      success: true,
      message: "All marked as read",
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error("mark-all-read error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// PATCH mark multiple as read
// ============================================
router.patch("/mark-read", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array required" });
    }

    const result = await Notification.updateMany(
      { _id: { $in: ids }, tenantId: req.tenantId }, // ← ADD
      { $set: { isRead: true } },
    );

    res.json({
      success: true,
      message: "Marked as read",
      count: result.modifiedCount,
    });
  } catch (err) {
    console.error("mark-read error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// PATCH mark single as read
// ============================================
router.patch("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId }, // ← ADD
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (err) {
    console.error("mark-read single error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// DELETE clear all — sirf is tenant ki
// ============================================
router.delete("/clear-all", async (req, res) => {
  try {
    const result = await Notification.deleteMany({ tenantId: req.tenantId }); // ← ADD
    res.json({ message: "All cleared", count: result.deletedCount });
  } catch (err) {
    console.error("clear-all error:", err);
    res.status(500).json({ message: "Clear failed" });
  }
});

// ============================================
// DELETE single notification
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("delete notification error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
