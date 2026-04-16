const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const ShopSettings = require("../models/ShopSettings");
const { tenantAuth, isOwner } = require("../middleware/tenantAuth");

// Multer setup for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    // Tenant specific logo name taaki overlap na ho
    cb(
      null,
      `logo_${req.tenantId || "default"}${path.extname(file.originalname)}`,
    );
  },
});
const upload = multer({ storage });

router.use(tenantAuth);

// ============================================
// GET shop settings — sirf is tenant ki
// ============================================
router.get("/", async (req, res) => {
  try {
    const settings = await ShopSettings.getInstance(req.tenantId); // ← tenantId pass karo
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// ============================================
// POST update settings — Owner only
// ============================================
router.post("/", isOwner, upload.single("logo"), async (req, res) => {
  try {
    const settings = await ShopSettings.getInstance(req.tenantId); // ← tenantId pass karo

    Object.keys(req.body).forEach((key) => {
      if (key !== "logo" && req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    if (req.file) {
      settings.logo = `/uploads/${req.file.filename}`;
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// ============================================
// PUT update settings — Owner only
// ============================================
router.put("/", isOwner, async (req, res) => {
  try {
    const settings = await ShopSettings.getInstance(req.tenantId); // ← tenantId pass karo
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
