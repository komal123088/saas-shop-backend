const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

router.use(tenantAuth);

// ============================================
// GET all inventory — sirf is tenant ka
// ============================================
router.get("/", async (req, res) => {
  try {
    const inventory = await Inventory.find({ tenantId: req.tenantId }).sort({
      createdAt: -1,
    });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============================================
// GET stats summary — sirf is tenant ka
// ============================================
router.get("/stats", async (req, res) => {
  try {
    const all = await Inventory.find({ tenantId: req.tenantId });

    const totalPurchased = all.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = all.reduce((sum, i) => sum + i.amountPaid, 0);
    const totalRemaining = all.reduce((sum, i) => sum + i.remainingAmount, 0);
    const totalItems = all.length;
    const totalQuantity = all.reduce((sum, i) => sum + i.quantity, 0);

    // Per supplier summary
    const supplierMap = {};
    all.forEach((item) => {
      if (!supplierMap[item.supplierName]) {
        supplierMap[item.supplierName] = {
          supplierName: item.supplierName,
          supplierPhone: item.supplierPhone,
          totalPurchased: 0,
          totalPaid: 0,
          totalRemaining: 0,
          totalItems: 0,
        };
      }
      supplierMap[item.supplierName].totalPurchased += item.totalAmount;
      supplierMap[item.supplierName].totalPaid += item.amountPaid;
      supplierMap[item.supplierName].totalRemaining += item.remainingAmount;
      supplierMap[item.supplierName].totalItems += 1;
    });

    res.json({
      totalPurchased,
      totalPaid,
      totalRemaining,
      totalItems,
      totalQuantity,
      suppliers: Object.values(supplierMap),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============================================
// POST add new inventory — Owner ya Manager only
// ============================================
router.post("/", isOwnerOrManager, async (req, res) => {
  try {
    const {
      supplierName,
      supplierPhone,
      itemDescription,
      quantity,
      unit,
      purchasePrice,
      amountPaid,
      purchaseDate,
      notes,
    } = req.body;

    if (!supplierName || !itemDescription || !quantity || !purchasePrice) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const totalAmount = Number(quantity) * Number(purchasePrice);
    const paid = Number(amountPaid) || 0;

    if (paid > totalAmount) {
      return res
        .status(400)
        .json({ message: "Paid amount cannot exceed total amount" });
    }

    const entry = new Inventory({
      tenantId: req.tenantId, // ← ADD
      supplierName,
      supplierPhone,
      itemDescription,
      quantity: Number(quantity),
      unit: unit || "Piece",
      purchasePrice: Number(purchasePrice),
      totalAmount,
      amountPaid: paid,
      remainingAmount: totalAmount - paid,
      purchaseDate: purchaseDate || new Date(),
      notes,
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============================================
// PATCH record payment — Owner ya Manager only
// ============================================
router.patch("/:id/payment", isOwnerOrManager, async (req, res) => {
  try {
    const { amount } = req.body;

    const entry = await Inventory.findOne({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!entry) return res.status(404).json({ message: "Entry not found" });

    const newPaid = entry.amountPaid + Number(amount);
    if (newPaid > entry.totalAmount) {
      return res.status(400).json({ message: "Payment exceeds total amount" });
    }

    entry.amountPaid = newPaid;
    entry.remainingAmount = entry.totalAmount - newPaid;
    await entry.save();

    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============================================
// DELETE entry — Owner ya Manager only
// ============================================
router.delete("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const deleted = await Inventory.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!deleted) return res.status(404).json({ message: "Entry not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
