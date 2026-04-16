const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

// Sab routes par tenantAuth
router.use(tenantAuth);

// ============================================
// GET all permanent customers — sirf is tenant ke
// ============================================
router.get("/permanent", async (req, res) => {
  try {
    const customers = await Customer.find({ tenantId: req.tenantId }).sort({
      name: 1,
    });

    const customersWithCredit = await Promise.all(
      customers.map(async (customer) => {
        const sales = await Sale.find({
          customer: customer._id,
          saleType: "permanent",
          tenantId: req.tenantId,
        });

        const totalCredit = sales.reduce(
          (sum, sale) => sum + (sale.total || 0),
          0,
        );

        return {
          ...customer.toObject(),
          totalCredit,
        };
      }),
    );

    res.json(customersWithCredit);
  } catch (err) {
    console.error("GET permanent error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// POST - Add new permanent customer
// ============================================
router.post("/permanent", async (req, res) => {
  try {
    const customer = new Customer({
      tenantId: req.tenantId, // ← ADD
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || "",
      gender: req.body.gender || "male",
      address: req.body.address || "",
      cnic: req.body.cnic || "",
      creditLimit: Number(req.body.creditLimit) || 50000,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      totalPurchases: 0,
      totalPaid: 0,
      remainingDue: 0,
    });

    const newCustomer = await customer.save();

    res.status(201).json({
      ...newCustomer.toObject(),
      totalCredit: 0,
    });
  } catch (err) {
    console.error("POST customer error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// PUT - Update customer — Owner ya Manager only
// ============================================
router.put("/permanent/:id", isOwnerOrManager, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.name = req.body.name || customer.name;
    customer.phone = req.body.phone || customer.phone;
    customer.email =
      req.body.email !== undefined ? req.body.email : customer.email;
    customer.gender = req.body.gender || customer.gender;
    customer.address =
      req.body.address !== undefined ? req.body.address : customer.address;
    customer.cnic = req.body.cnic !== undefined ? req.body.cnic : customer.cnic;
    customer.creditLimit =
      req.body.creditLimit !== undefined
        ? Number(req.body.creditLimit)
        : customer.creditLimit;
    customer.dueDate = req.body.dueDate
      ? new Date(req.body.dueDate)
      : customer.dueDate;

    const updated = await customer.save();

    const sales = await Sale.find({
      customer: updated._id,
      saleType: "permanent",
      tenantId: req.tenantId,
    });
    const totalCredit = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    res.json({ ...updated.toObject(), totalCredit });
  } catch (err) {
    console.error("PUT customer error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// DELETE customer — Owner ya Manager only
// ============================================
router.delete("/permanent/:id", isOwnerOrManager, async (req, res) => {
  try {
    const deleted = await Customer.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("DELETE customer error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// POST - Record payment
// ============================================
router.post("/:id/payment", async (req, res) => {
  try {
    const { amount, method = "cash", detail = "", saleId } = req.body;

    if (!saleId) {
      return res
        .status(400)
        .json({ message: "saleId is required for payment" });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    const sale = await Sale.findOne({
      _id: saleId,
      tenantId: req.tenantId,
    });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    if (sale.customer?.toString() !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Sale does not belong to this customer" });
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    sale.payments.push({
      method,
      amount: paymentAmount,
      detail,
      date: new Date(),
    });
    sale.paidAmount = (sale.paidAmount || 0) + paymentAmount;
    await sale.save();

    customer.totalPaid += paymentAmount;
    customer.remainingDue = Math.max(0, customer.remainingDue - paymentAmount);
    const updatedCustomer = await customer.save();

    // Recalculate totalCredit
    const sales = await Sale.find({
      customer: customer._id,
      saleType: "permanent",
      tenantId: req.tenantId,
    });
    const totalCredit = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    res.json({
      message: "Payment recorded successfully",
      customer: { ...updatedCustomer.toObject(), totalCredit },
      sale,
    });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// GET customer credit sales history
// ============================================
router.get("/:id/sales", async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = {
      customer: req.params.id,
      saleType: "permanent",
      tenantId: req.tenantId, // ← ADD
    };

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .populate("items.product", "name price");

    res.json(sales);
  } catch (err) {
    console.error("GET customer sales error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
