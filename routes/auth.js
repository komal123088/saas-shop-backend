const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Owner = require("../models/Owner");
const Employee = require("../models/Employee");
const { JWT_SECRET } = require("../env");
const { tenantAuth } = require("../middleware/tenantAuth");
const Tenant = require("../models/Tenant");
// ============================================
//  EMAIL TRANSPORTER SETUP
// ============================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ============================================
//  OWNER REGISTRATION (One-time per tenant)
// ============================================
router.post("/owner/register", async (req, res) => {
  try {
    const { name, email, password, phone, shopName, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    // Is tenant ka owner pehle se hai?
    const existingOwner = await Owner.findOne({ tenantId });
    if (existingOwner) {
      return res.status(403).json({
        message:
          "Owner already registered for this shop. Only one owner allowed.",
      });
    }

    const owner = new Owner({
      tenantId,
      name,
      email,
      password,
      phone,
      shopName,
      isRegistered: true,
      tokenVersion: 0,
    });

    await owner.save();

    const token = jwt.sign(
      {
        id: owner._id,
        role: "owner",
        isOwner: true,
        tenantId: owner.tenantId,
        tokenVersion: owner.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      message: "Owner registered successfully",
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: "owner",
        isOwner: true,
        tenantId: owner.tenantId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
//  OWNER LOGIN
// ============================================
router.post("/owner/login", async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    // Sirf is tenant ka owner dhundo
    const owner = await Owner.findOne({ email, tenantId });
    if (!owner) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // tokenVersion check — agar password reset hua ho to purana token invalid
    const token = jwt.sign(
      {
        id: owner._id,
        role: "owner",
        isOwner: true,
        tenantId: owner.tenantId,
        tokenVersion: owner.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: "owner",
        isOwner: true,
        tenantId: owner.tenantId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
//  EMPLOYEE LOGIN
// ============================================
router.post("/employee/login", async (req, res) => {
  try {
    const { username, password, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    // Sirf is tenant ka employee dhundo
    const employee = await Employee.findOne({
      username: username.trim(),
      tenantId,
    });

    if (!employee) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!employee.isActive) {
      return res
        .status(403)
        .json({ message: "Account is inactive. Contact your admin." });
    }

    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: employee.role,
        isOwner: false,
        tenantId: employee.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: employee._id,
        name: employee.name,
        username: employee.username,
        role: employee.role,
        isOwner: false,
        tenantId: employee.tenantId,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
//  CHECK IF OWNER EXISTS (per tenant)
// ============================================
router.get("/owner/exists", async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.json({ exists: false });
    const owner = await Owner.findOne({ tenantId });
    res.json({ exists: !!owner });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
//  FORGOT PASSWORD - REQUEST RESET CODE
// ============================================
router.post("/owner/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const owner = await Owner.findOne({ email });
    if (!owner) {
      return res.status(404).json({
        message: "No account found with this email address",
      });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    owner.resetPasswordCode = resetCode;
    owner.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await owner.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `${owner.shopName || "Shop"} - Password Reset Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #FFC107; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333;">Hello ${owner.name},</p>
            <p style="font-size: 14px; color: #666;">
              We received a request to reset your password. Use the code below to proceed:
            </p>
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #FFC107;">
              <h1 style="color: #FFC107; letter-spacing: 8px; margin: 0; font-size: 36px;">
                ${resetCode}
              </h1>
            </div>
            <p style="font-size: 14px; color: #666;">
              This code will expire in <strong>15 minutes</strong>.
            </p>
            <p style="font-size: 14px; color: #666;">
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      message: "Password reset code has been sent to your email",
      email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      message: "Failed to send reset code. Please try again later.",
      error: err.message,
    });
  }
});

// ============================================
//  VERIFY RESET CODE
// ============================================
router.post("/owner/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    const owner = await Owner.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!owner) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
      });
    }

    const resetToken = jwt.sign(
      {
        id: owner._id,
        purpose: "password-reset",
        code: code,
        tenantId: owner.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({
      message: "Code verified successfully",
      resetToken,
    });
  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({
      message: "Verification failed. Please try again.",
      error: err.message,
    });
  }
});

// ============================================
//  RESET PASSWORD - INVALIDATES ALL SESSIONS
// ============================================
router.post("/owner/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const owner = await Owner.findById(decoded.id);
    if (!owner) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!owner.resetPasswordCode || owner.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        message: "Reset session has expired. Please request a new code.",
      });
    }

    owner.password = newPassword;
    owner.tokenVersion = (owner.tokenVersion || 0) + 1;
    owner.resetPasswordCode = undefined;
    owner.resetPasswordExpires = undefined;

    await owner.save();

    // Confirmation email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: owner.email,
        subject: `${owner.shopName || "Shop"} - Password Changed Successfully`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">✅ Password Changed</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
              <p style="font-size: 16px; color: #333;">Hello ${owner.name},</p>
              <p style="font-size: 14px; color: #666;">
                Your password has been successfully changed. All previous sessions have been logged out for security.
              </p>
              <p style="font-size: 14px; color: #666;">
                If you did not make this change, please contact support immediately.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/login"
                   style="background-color: #FFC107; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
    }

    res.json({
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      message: "Failed to reset password. Please try again.",
      error: err.message,
    });
  }
});
// ============================================
// GET /me — Owner profile + Tenant info
// ============================================

router.get("/me", tenantAuth, async (req, res) => {
  try {
    const owner = await Owner.findOne({
      _id: req.user.id,
      tenantId: req.tenantId,
    }).select("-password -tokenVersion");

    const tenant = await Tenant.findOne({ tenantId: req.tenantId }).populate(
      "plan",
    );

    res.json({
      owner,
      tenant: {
        tenantId: tenant?.tenantId,
        shopName: tenant?.shopName,
        status: tenant?.status,
        plan: tenant?.plan,
        planStartDate: tenant?.planStartDate,
        planExpiry: tenant?.planExpiry,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
