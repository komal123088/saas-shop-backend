const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { tenantAuth } = require("../middleware/tenantAuth");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.use(tenantAuth);

// ============================================
// POST send email — authenticated users only
// ============================================
router.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ message: "to and subject are required" });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    res
      .status(500)
      .json({ message: "Failed to send email", error: err.message });
  }
});

module.exports = router;
