const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin");
const JWT_SECRET = process.env.JWT_SECRET;

// ── Register (one time only) ──
router.post("/register", async (req, res) => {
  try {
    const existing = await SuperAdmin.findOne({});
    if (existing) {
      return res.status(403).json({ message: "Super admin already exists" });
    }
    const { name, email, password } = req.body;
    const admin = await SuperAdmin.create({ name, email, password });
    res
      .status(201)
      .json({ message: "Super admin created", email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Login ──
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id, role: "superadmin" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
