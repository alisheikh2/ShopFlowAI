const express = require("express");
const {
  getSummary,
  getTopProductsController,
  getRevenueChart,
  getCategoryBreakdownController,
  getGeographicBreakdownController,
  getPaymentMethodBreakdownController,
  exportRevenueCSV,
} = require("../controllers/analytics.controller");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const ROLES = require("../constants/roles");

const router = express.Router();

router.use(verifyJWT, verifyRole(ROLES.ADMIN));

router.get("/summary", getSummary);
router.get("/top-products", getTopProductsController);
router.get("/revenue-chart", getRevenueChart);
router.get("/category-breakdown", getCategoryBreakdownController);
router.get("/geographic-breakdown", getGeographicBreakdownController);
router.get("/payment-methods", getPaymentMethodBreakdownController);
router.get("/export/revenue-csv", exportRevenueCSV);

module.exports = router;