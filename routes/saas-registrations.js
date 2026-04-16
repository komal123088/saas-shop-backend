const express = require("express");
const router = express.Router();
const Tenant = require("../models/Tenant");
const Plan = require("../models/Plan");
const superAdminAuth = require("../middleware/superAdminAuth");
const {
  sendApprovalEmail,
  sendRegistrationReceived,
} = require("../utils/email");
const crypto = require("crypto");

// ⚠️ Same DB hai dono ka — isliye directly Owner model use kar sakte hain
// Path apne folder structure ke mutabiq set karo
const Owner = require("../models/Owner");

// ─── PUBLIC: User submits registration form ───────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { shopName, ownerName, email, phone, planId } = req.body;

    if (!shopName || !ownerName || !email || !phone || !planId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Tenant.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ message: "This email is already registered" });
    }

    const plan = await Plan.findById(planId);
    if (!plan)
      return res.status(400).json({ message: "Invalid plan selected" });

    const subdomain = shopName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const tenantId = "tenant_" + Date.now();

    const tenant = await Tenant.create({
      shopName,
      ownerName,
      email,
      phone,
      plan: planId,
      tenantId,
      subdomain,
      status: "pending",
    });

    // User ko confirmation email bhejo
    try {
      await sendRegistrationReceived(email, ownerName);
    } catch (emailErr) {
      console.error("Confirmation email failed:", emailErr.message);
    }

    res.status(201).json({
      message:
        "Registration submitted! You will receive an email once approved.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN: Get all pending registrations ────────────────────────────────────
router.get("/pending", superAdminAuth, async (req, res) => {
  try {
    const pending = await Tenant.find({ status: "pending" })
      .populate("plan", "name price")
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN: Approve a registration ───────────────────────────────────────────
router.post("/approve/:id", superAdminAuth, async (req, res) => {
  try {
    const { months } = req.body;

    const tenant = await Tenant.findById(req.params.id).populate("plan");
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    // Temporary password generate karo
    const tempPassword = crypto.randomBytes(5).toString("hex"); // e.g. "a3f9b2c1d0"

    const planStart = new Date();
    const planExpiry = new Date();
    planExpiry.setMonth(planExpiry.getMonth() + (months || 1));

    // ── 1. Tenant active karo ──
    tenant.status = "active";
    tenant.planStartDate = planStart;
    tenant.planExpiry = planExpiry;
    tenant.tempPassword = tempPassword;
    await tenant.save();

    // ── 2. Shop software mein Owner create karo (same DB) ──
    try {
      const existingOwner = await Owner.findOne({ tenantId: tenant.tenantId });

      if (!existingOwner) {
        await Owner.create({
          tenantId: tenant.tenantId, // tenant se link
          name: tenant.ownerName,
          email: tenant.email,
          password: tempPassword, // bcrypt auto hash hoga Owner model mein
          shopName: tenant.shopName,
          phone: tenant.phone,
          isRegistered: true,
          tokenVersion: 0,
        });
        console.log("✅ Owner created in shop software:", tenant.email);
      } else {
        console.log("⚠️ Owner already exists:", tenant.email);
      }
    } catch (ownerErr) {
      console.error("❌ Owner creation failed:", ownerErr.message);
      // Owner create na ho to bhi tenant approve rehta hai
      // Admin manually handle kar sakta hai
    }

    // ── 3. User ko approval email bhejo ──
    try {
      await sendApprovalEmail(tenant, tempPassword);
    } catch (emailErr) {
      console.error("Approval email failed:", emailErr.message);
    }

    res.json({
      message: "Tenant approved! Owner created and email sent.",
      tenant,
      tempPassword, // admin panel mein bhi dikhta hai
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN: Reject a registration ────────────────────────────────────────────
router.post("/reject/:id", superAdminAuth, async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: "Registration rejected and removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
