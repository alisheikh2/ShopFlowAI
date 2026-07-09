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
const { cacheResponse, getCacheTTL } = require("../middleware/cache.middleware");
const { buildAnalyticsKey } = require("../utils/cacheKeys");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const ROLES = require("../constants/roles");

const router = express.Router();

const analyticsTTL = getCacheTTL(process.env.CACHE_TTL_ANALYTICS, 300);

router.use(verifyJWT, verifyRole(ROLES.ADMIN));

router.get("/summary", cacheResponse(analyticsTTL, buildAnalyticsKey("summary")), getSummary);
router.get(
  "/top-products",
  cacheResponse(analyticsTTL, buildAnalyticsKey("top-products")),
  getTopProductsController,
);
router.get(
  "/revenue-chart",
  cacheResponse(analyticsTTL, buildAnalyticsKey("revenue-chart")),
  getRevenueChart,
);
router.get(
  "/category-breakdown",
  cacheResponse(analyticsTTL, buildAnalyticsKey("category-breakdown")),
  getCategoryBreakdownController,
);
router.get(
  "/geographic-breakdown",
  cacheResponse(analyticsTTL, buildAnalyticsKey("geographic-breakdown")),
  getGeographicBreakdownController,
);
router.get(
  "/payment-methods",
  cacheResponse(analyticsTTL, buildAnalyticsKey("payment-methods")),
  getPaymentMethodBreakdownController,
);
router.get("/export/revenue-csv", exportRevenueCSV);

module.exports = router;
