const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

router.use(tenantAuth);

// ============================================
// GET all sales — sirf is tenant ki
// ============================================
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find({ tenantId: req.tenantId }) // ← ADD
      .populate("customer", "name phone type")
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// GET sales report — sirf is tenant ka
// ============================================
router.get("/report", async (req, res) => {
  try {
    const { start, end } = req.query;

    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
    }

    // Recovered credit in this period
    let recoveredAmount = 0;
    if (startDate && endDate) {
      const recoveredAgg = await Sale.aggregate([
        { $match: { tenantId: req.tenantId, saleType: { $ne: "cash" } } }, // ← ADD
        { $unwind: "$payments" },
        { $match: { "payments.date": { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: "$payments.amount" } } },
      ]);
      recoveredAmount = recoveredAgg[0]?.total || 0;
    }

    // Sales in date range — sirf is tenant ki
    const salesQuery = { tenantId: req.tenantId }; // ← ADD
    if (startDate && endDate) {
      salesQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const sales = await Sale.find(salesQuery);

    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashSales = sales
      .filter((s) => s.saleType === "cash")
      .reduce((sum, s) => sum + (s.total || 0), 0);
    const creditSales = totalSales - cashSales;

    // Real profit calculation
    const productIds = [
      ...new Set(
        sales.flatMap((s) =>
          s.items.map((i) => i.product?.toString()).filter(Boolean),
        ),
      ),
    ];
    const productDocs = await Product.find(
      { _id: { $in: productIds }, tenantId: req.tenantId }, // ← ADD
      "costPrice",
    );
    const costMap = {};
    productDocs.forEach((p) => {
      costMap[p._id.toString()] = p.costPrice || 0;
    });

    let realProfit = 0;
    sales.forEach((s) => {
      s.items.forEach((item) => {
        const costPrice = costMap[item.product?.toString()] || 0;
        const salePrice = item.price || 0;
        const qty = item.qty || 0;
        const itemDiscount = item.itemDiscount || 0;
        realProfit += (salePrice - itemDiscount - costPrice) * qty;
      });
    });

    const totalDiscount = sales.reduce((sum, s) => {
      const sub = s.subtotal || 0;
      const discPct = s.discountPercent || 0;
      return sum + (sub * discPct) / 100;
    }, 0);
    realProfit -= totalDiscount;

    // Top products
    const productMap = {};
    sales.forEach((s) => {
      s.items.forEach((i) => {
        const name = i.name || "Unknown Item";
        if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
        productMap[name].qty += i.qty || 0;
        productMap[name].revenue += (i.price || 0) * (i.qty || 0);
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Credit remaining — sirf is tenant ke customers
    const customers = await Customer.find({ tenantId: req.tenantId }); // ← ADD
    const permanentRemaining = customers.reduce(
      (sum, c) => sum + (c.remainingDue || 0),
      0,
    );

    const allTempSales = await Sale.find({
      tenantId: req.tenantId,
      saleType: "temporary",
    }); // ← ADD
    const temporaryRemaining = allTempSales.reduce(
      (sum, s) => sum + ((s.total || 0) - (s.paidAmount || 0)),
      0,
    );

    res.json({
      totalSales,
      cashSales,
      creditSales,
      recoveredAmount,
      saleCount: sales.length,
      cashCount: sales.filter((s) => s.saleType === "cash").length,
      creditCount: sales.filter((s) => s.saleType !== "cash").length,
      profit: realProfit,
      topProducts,
      permanentRemaining,
      temporaryRemaining,
    });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ message: "Report error: " + err.message });
  }
});

// ============================================
// POST create sale
// ============================================
router.post("/", async (req, res) => {
  try {
    const sale = new Sale({
      ...req.body,
      tenantId: req.tenantId, // ← ADD
    });
    await sale.save();

    // Stock reduce karo — sirf is tenant ke products
    for (let item of req.body.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, tenantId: req.tenantId }, // ← ADD
        { $inc: { stock: -item.qty } },
      );
    }

    // Permanent customer ka due update karo
    if (req.body.saleType === "permanent" && req.body.customer) {
      await Customer.findOneAndUpdate(
        { _id: req.body.customer, tenantId: req.tenantId }, // ← ADD
        {
          $inc: {
            totalPurchases: req.body.total,
            remainingDue: req.body.total,
          },
        },
      );
    }

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// PATCH update sale — Owner ya Manager only
// ============================================
router.patch("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const updated = await Sale.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId }, // ← ADD
      req.body,
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Sale not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================================
// DELETE sale — Owner only
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    if (!req.isOwner) {
      return res.status(403).json({ message: "Access denied. Owner only." });
    }

    const sale = await Sale.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId, // ← ADD
    });

    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json({ message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
