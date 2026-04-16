const express = require("express");
const Tenant = require("../models/Tenant");
const superAdminAuth = require("../middleware/superAdminAuth");
const router = express.Router();

// Get all tenants
router.get("/", superAdminAuth, async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { shopName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const tenants = await Tenant.find(filter)
      .populate("plan", "name price")
      .sort({ createdAt: -1 });

    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single tenant
router.get("/:id", superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate("plan");
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create tenant manually (super admin se)
router.post("/", superAdminAuth, async (req, res) => {
  try {
    const { shopName, ownerName, email, phone, planId, months } = req.body;

    const subdomain = shopName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const tenantId = "tenant_" + Date.now();
    const planExpiry = new Date();
    planExpiry.setMonth(planExpiry.getMonth() + (months || 1));

    const tenant = await Tenant.create({
      shopName,
      ownerName,
      email,
      phone,
      plan: planId,
      tenantId,
      subdomain,
      status: "active",
      planStartDate: new Date(),
      planExpiry,
    });

    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend / Activate tenant
router.patch("/:id/status", superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    );
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Extend plan
router.patch("/:id/extend", superAdminAuth, async (req, res) => {
  try {
    const { months } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    const currentExpiry =
      tenant.planExpiry > new Date() ? tenant.planExpiry : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + months);

    tenant.planExpiry = currentExpiry;
    tenant.status = "active";
    await tenant.save();

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete tenant
router.delete("/:id", superAdminAuth, async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
