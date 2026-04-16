const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const Employee = require("../models/Employee");
const Expense = require("../models/Expense");

const getDashboardStats = async (req, res) => {
  try {
    const tenantId = req.tenantId; // ← tenantAuth se aata hai

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // ── Today's sales total ──
    const dailySales = await Sale.aggregate([
      { $match: { tenantId, createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // ── This month's sales total ──
    const monthlySales = await Sale.aggregate([
      { $match: { tenantId, createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // ── Today's orders count ──
    const todaysOrders = await Sale.countDocuments({
      tenantId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // ── Low stock count ──
    const lowStockCount = await Product.countDocuments({
      tenantId,
      $expr: { $lte: ["$stock", "$minStockAlert"] },
    });

    // ── This month's profit ──
    const salesThisMonth = await Sale.find({
      tenantId,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }).populate("items.product", "costPrice");

    let profit = 0;
    salesThisMonth.forEach((sale) => {
      const discountMultiplier = 1 - (sale.discountPercent || 0) / 100;
      sale.items.forEach((item) => {
        if (item.product) {
          const revenue = item.price * item.qty * discountMultiplier;
          const cost = item.product.costPrice * item.qty;
          profit += revenue - cost;
        }
      });
    });

    // ── This month's expenses ──
    const expenseAgg = await Expense.aggregate([
      { $match: { tenantId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseAgg[0]?.total || 0;

    // ── Outstanding credit ──
    const customers = await Customer.find({ tenantId });
    const totalOutstanding = customers.reduce(
      (sum, c) => sum + (c.remainingDue || 0),
      0,
    );

    // ── Total counts ──
    const [totalProducts, totalCustomers, activeEmployees] = await Promise.all([
      Product.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId }),
      Employee.countDocuments({ tenantId, isActive: true }),
    ]);

    // ── Low stock products list ──
    const lowStockProducts = await Product.find({
      tenantId,
      $expr: { $lte: ["$stock", "$minStockAlert"] },
    })
      .select("name stock minStockAlert sku")
      .populate("category", "name")
      .limit(10);

    res.json({
      dailySales: dailySales[0]?.total || 0,
      monthlySales: monthlySales[0]?.total || 0,
      totalProfit: profit,
      totalExpenses,
      netProfit: profit - totalExpenses,
      todaysOrders,
      lowStockCount,
      lowStockProducts,
      totalOutstanding,
      totalProducts,
      totalCustomers,
      activeEmployees,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats };
