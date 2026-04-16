const express = require("express");
const router = express.Router();
const Location = require("../models/Location");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

router.use(tenantAuth);

// ============================================
// GET all locations — sirf is tenant ki
// ============================================
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find({ tenantId: req.tenantId }) // ← ADD
      .populate("assignedStaff", "name role");
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// POST new location — Owner ya Manager only
// ============================================
router.post("/", isOwnerOrManager, async (req, res) => {
  try {
    const location = new Location({
      ...req.body,
      tenantId: req.tenantId, // ← ADD
    });
    const saved = await location.save();
    const populated = await Location.findById(saved._id).populate(
      "assignedStaff",
      "name role",
    );
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// PUT update location — Owner ya Manager only
// ============================================
router.put("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const updated = await Location.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId }, // ← ADD
      req.body,
      { new: true },
    ).populate("assignedStaff", "name role");

    if (!updated)
      return res.status(404).json({ message: "Location not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// PATCH toggle active — Owner ya Manager only
// ============================================
router.patch("/:id/toggle", isOwnerOrManager, async (req, res) => {
  try {
    const loc = await Location.findOne({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!loc) return res.status(404).json({ message: "Location not found" });

    loc.isActive = req.body.isActive;
    const saved = await loc.save();
    const populated = await Location.findById(saved._id).populate(
      "assignedStaff",
      "name role",
    );
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// DELETE location — Owner only
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    if (!req.isOwner) {
      return res.status(403).json({ message: "Access denied. Owner only." });
    }

    const deleted = await Location.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!deleted)
      return res.status(404).json({ message: "Location not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
