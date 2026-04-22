require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const PORT = process.env.PORT || 3000;

// Connect DB
connectDB();

const app = express();

// ── Uploads directory ──
if (process.env.NODE_ENV !== 'production') {
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ Uploads directory created");
  }
}

// ── Middleware ──
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ════════════════════════════════════════
//  SHOP ROUTES
// ════════════════════════════════════════
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/sales", require("./routes/salesRoutes"));
app.use("/api/shop-settings", require("./routes/shopSettings"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/locations", require("./routes/locations"));
app.use("/api/expenses", require("./routes/expense"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));

// ════════════════════════════════════════
//  SAAS ROUTES
// ════════════════════════════════════════
app.use("/api/saas/auth", require("./routes/saas-auth"));
app.use("/api/saas/tenants", require("./routes/saas-tenants"));
app.use("/api/saas/plans", require("./routes/saas-plans"));
app.use("/api/saas/registrations", require("./routes/saas-registrations"));
app.use("/api/saas/analytics", require("./routes/saas-analytics"));

// ── Static ──
app.get("/", (req, res) => res.send("✅ ShopSaaS Backend Running"));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const MYPORT = PORT || 5000;
app.listen(MYPORT, () => {
  console.log(`✅ Server running on port ${MYPORT}`);
});
