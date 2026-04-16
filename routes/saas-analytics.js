const express = require("express");
const router = express.Router();
const Tenant = require("../models/Tenant");
const superAdminAuth = require("../middleware/superAdminAuth");

router.use(superAdminAuth);

// ── Dashboard stats ──
router.get("/", async (req, res) => {
  try {
    const [total, active, suspended, expired, pending] = await Promise.all([
      Tenant.countDocuments({}),
      Tenant.countDocuments({ status: "active" }),
      Tenant.countDocuments({ status: "suspended" }),
      Tenant.countDocuments({ status: "expired" }),
      Tenant.countDocuments({ status: "pending" }),
    ]);

    const recentTenants = await Tenant.find()
      .populate("plan", "name price")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ total, active, suspended, expired, pending, recentTenants });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
