const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { tenantAuth } = require("../middleware/tenantAuth");

router.use(tenantAuth);

router.get("/stats", getDashboardStats);

module.exports = router;
