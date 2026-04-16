const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const Notification = require("../models/Notification");
const {tenantAuth} = require("../middleware/tenantAuth");

// Sab routes par tenantAuth lagao
router.use(tenantAuth);

// ============================================
// ROLE CHECK HELPER
// ============================================
const isOwnerOrManager = (req, res) => {
  if (!req.isOwner && req.userRole !== "manager") {
    res.status(403).json({
      success: false,
      message: "Access denied. Owner or Manager only.",
    });
    return false;
  }
  return true;
};

const isOwnerOnly = (req, res) => {
  if (!req.isOwner) {
    res.status(403).json({
      success: false,
      message: "Access denied. Owner only.",
    });
    return false;
  }
  return true;
};

// ============================================
// GET ALL EMPLOYEES — Sirf is tenant ke
// ============================================
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find({ tenantId: req.tenantId })
      .select("-password -__v")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET SINGLE EMPLOYEE
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select("-password -__v");

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// CREATE EMPLOYEE — Owner ya Manager only
// ============================================
router.post("/", async (req, res) => {
  if (!isOwnerOrManager(req, res)) return;

  try {
    const employee = new Employee({
      ...req.body,
      tenantId: req.tenantId, // automatically add
    });

    const saved = await employee.save();

    // Notification create karo
    try {
      await Notification.create({
        tenantId: req.tenantId,
        type: "employee-added",
        message: `New employee added: ${saved.name} (${saved.role})`,
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    const response = saved.toObject();
    delete response.password;

    res.status(201).json({ success: true, data: response });
  } catch (err) {
    console.error("Employee creation error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create employee",
    });
  }
});

// ============================================
// UPDATE EMPLOYEE — Owner ya Manager only
// ============================================
router.put("/:id", async (req, res) => {
  if (!isOwnerOrManager(req, res)) return;

  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Fields update karo
    employee.name = req.body.name || employee.name;
    employee.phone = req.body.phone || employee.phone;
    employee.email =
      req.body.email !== undefined ? req.body.email : employee.email;
    employee.role = req.body.role || employee.role;
    employee.salary = req.body.salary || employee.salary;
    employee.joinDate = req.body.joinDate || employee.joinDate;
    employee.address =
      req.body.address !== undefined ? req.body.address : employee.address;
    employee.cnic = req.body.cnic !== undefined ? req.body.cnic : employee.cnic;
    employee.username = req.body.username || employee.username;
    employee.isActive =
      req.body.isActive !== undefined ? req.body.isActive : employee.isActive;

    // Password sirf tab update karo jab diya gaya ho
    if (req.body.password && req.body.password.trim() !== "") {
      employee.password = req.body.password.trim();
    }

    const updated = await employee.save();
    const response = updated.toObject();
    delete response.password;

    res.json({ success: true, data: response });
  } catch (err) {
    console.error("Employee update error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to update employee",
    });
  }
});

// ============================================
// DELETE EMPLOYEE — Owner only
// ============================================
router.delete("/:id", async (req, res) => {
  if (!isOwnerOnly(req, res)) return;

  try {
    const deleted = await Employee.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during deletion" });
  }
});

// ============================================
// PAY SALARY — Owner ya Manager only
// ============================================
router.patch("/:id/pay-salary", async (req, res) => {
  if (!isOwnerOrManager(req, res)) return;

  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"

    // Is mahine ki salary pehle se pay ho chuki hai?
    if (employee.lastPaidMonth === currentMonth) {
      return res.status(400).json({
        success: false,
        message: `Salary already paid for ${currentMonth}`,
      });
    }

    // Salary history mein add karo
    employee.salaryHistory.push({
      amount: employee.salary,
      paidDate: new Date(),
      month: currentMonth,
      status: "paid",
    });

    employee.lastPaidMonth = currentMonth;
    employee.salaryStatus = "paid";

    const updated = await employee.save();

    // Salary paid notification
    try {
      await Notification.create({
        tenantId: req.tenantId,
        type: "salary-paid",
        message: `Salary paid to ${employee.name}: PKR ${employee.salary} for ${currentMonth}`,
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    const response = updated.toObject();
    delete response.password;

    res.json({ success: true, data: response });
  } catch (err) {
    console.error("Pay salary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process salary payment",
      error: err.message,
    });
  }
});

// ============================================
// GET SALARY HISTORY — Single employee
// ============================================
router.get("/:id/salary-history", async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select("name salary salaryHistory lastPaidMonth salaryStatus");

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// TOGGLE EMPLOYEE ACTIVE STATUS — Owner only
// ============================================
router.patch("/:id/toggle-status", async (req, res) => {
  if (!isOwnerOnly(req, res)) return;

  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    res.json({
      success: true,
      message: `Employee ${employee.isActive ? "activated" : "deactivated"}`,
      isActive: employee.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
