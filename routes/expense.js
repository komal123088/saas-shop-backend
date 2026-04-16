const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

router.use(tenantAuth);

// ============================================
// GET all expenses — sirf is tenant ke
// ============================================
router.get("/", async (req, res) => {
  try {
    const { start, end, type } = req.query;

    let query = { tenantId: req.tenantId }; // ← ADD

    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    if (type) query.type = type;

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error("GET expenses error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// GET expense summary — sirf is tenant ka
// ============================================
router.get("/summary", async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = { tenantId: req.tenantId }; // ← ADD

    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    const expensesByType = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalExpenses = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      expensesByType,
      totalExpenses: totalExpenses[0]?.total || 0,
    });
  } catch (err) {
    console.error("Expense summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// POST - Add new expense — Owner ya Manager only
// ============================================
router.post("/", isOwnerOrManager, async (req, res) => {
  try {
    const expense = new Expense({
      tenantId: req.tenantId, // ← ADD
      type: req.body.type,
      category: req.body.category,
      description: req.body.description,
      amount: Number(req.body.amount),
      employee: req.body.employee || "",
      date: req.body.date ? new Date(req.body.date) : new Date(),
      paymentMethod: req.body.paymentMethod || "cash",
      notes: req.body.notes || "",
    });

    const newExpense = await expense.save();
    res.status(201).json(newExpense);
  } catch (err) {
    console.error("POST expense error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// PUT - Update expense — Owner ya Manager only
// ============================================
router.put("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expense.type = req.body.type || expense.type;
    expense.category = req.body.category || expense.category;
    expense.description = req.body.description || expense.description;
    expense.amount =
      req.body.amount !== undefined ? Number(req.body.amount) : expense.amount;
    expense.employee = req.body.employee || expense.employee;
    expense.date = req.body.date ? new Date(req.body.date) : expense.date;
    expense.paymentMethod = req.body.paymentMethod || expense.paymentMethod;
    expense.notes = req.body.notes || expense.notes;

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (err) {
    console.error("PUT expense error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// DELETE expense — Owner ya Manager only
// ============================================
router.delete("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("DELETE expense error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
