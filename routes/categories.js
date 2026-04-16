const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

router.use(tenantAuth);

// ============================================
// GET all categories —
// ============================================
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ tenantId: req.tenantId }) // ← ADD
      .sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("GET categories error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// POST new category — Owner ya Manager only
// ============================================
router.post("/", isOwnerOrManager, async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    // Is tenant mein same name check karo
    const existing = await Category.findOne({
      tenantId: req.tenantId,
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existing)
      return res.status(400).json({ message: "Category already exists" });

    const category = new Category({
      tenantId: req.tenantId, // ← ADD
      name,
      isActive: isActive !== false,
    });

    const saved = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("POST category error:", err);
    res.status(500).json({ message: "Failed to save" });
  }
});

// ============================================
// PUT update — Owner ya Manager only
// ============================================
router.put("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const updated = await Category.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId }, // ← ADD
      req.body,
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ============================================
// PATCH toggle active — Owner ya Manager only
// ============================================
router.patch("/:id/toggle", isOwnerOrManager, async (req, res) => {
  try {
    const cat = await Category.findOne({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });
    if (!cat) return res.status(404).json({ message: "Not found" });

    cat.isActive = req.body.isActive;
    const saved = await cat.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: "Toggle failed" });
  }
});

// ============================================
// DELETE — Owner ya Manager only
// ============================================
router.delete("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const deleted = await Category.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
