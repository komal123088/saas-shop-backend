const express = require("express");
const Plan = require("../models/Plan");
const superAdminAuth = require("../middleware/superAdminAuth");
const router = express.Router();

// Get all plans
router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update plan price or features
router.put("/:id", superAdminAuth, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Seed default plans (ek baar chalao)
router.post("/seed", superAdminAuth, async (req, res) => {
  try {
    await Plan.deleteMany({});
    await Plan.insertMany([
      {
        name: "normal",
        price: 2999,
        maxEmployees: 3,
        maxProducts: 500,
        features: ["cashier_login", "basic_reports", "product_management"],
        description: "Small shops ke liye",
      },
      {
        name: "standard",
        price: 5999,
        maxEmployees: 10,
        maxProducts: 5000,
        features: [
          "cashier_login",
          "manager_login",
          "advanced_reports",
          "export",
        ],
        description: "Growing businesses ke liye",
      },
      {
        name: "premium",
        price: 9999,
        maxEmployees: null,
        maxProducts: null,
        features: [
          "all_features",
          "multi_branch",
          "api_access",
          "priority_support",
        ],
        description: "Enterprise level shops ke liye",
      },
    ]);
    res.json({ message: "Plans seeded successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
