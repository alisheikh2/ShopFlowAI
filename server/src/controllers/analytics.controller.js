const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError"); 
const {
  getDashboardSummary,
  getGrowthComparison,
  getTopProducts,
  getDailyRevenue,
  getCategoryBreakdown,
  getGeographicBreakdown,
  getPaymentMethodBreakdown,
  generateRevenueCSV,
} = require("../services/analytics.service");


const getSummary = asyncHandler(async (req, res) => {
  let days = Number(req.query.days) || 30;
  days = Math.min(Math.max(days, 1), 365);

  const [summary, growth] = await Promise.all([
    getDashboardSummary(),
    getGrowthComparison(days),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, "Dashboard summary fetched successfully", { ...summary, growth }));
});

const getTopProductsController = asyncHandler(async (req, res) => {
  let limit = Number(req.query.limit) || 5;
  limit = Math.min(Math.max(limit, 1), 50); // 1 se 50 ke beech clamp karo

  const products = await getTopProducts(limit);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Top products fetched successfully", { products }),
    );
});

const getRevenueChart = asyncHandler(async (req, res) => {
  const { days, startDate, endDate } = req.query;

  if (startDate && isNaN(Date.parse(startDate))) {
    throw new ApiError(400, "Invalid startDate");
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    throw new ApiError(400, "Invalid endDate");
  }

  let daysNum = days ? Number(days) : 30;
  daysNum = Math.min(Math.max(daysNum, 1), 365);

  const data = await getDailyRevenue({
    days: daysNum,
    startDate,
    endDate,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Revenue chart data fetched successfully", { data }),
    );
});

const getCategoryBreakdownController = asyncHandler(async (req, res) => {
  const categories = await getCategoryBreakdown();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Category breakdown fetched successfully", {
        categories,
      }),
    );
});

const getGeographicBreakdownController = asyncHandler(async (req, res) => {
  const locations = await getGeographicBreakdown();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Geographic breakdown fetched successfully", {
        locations,
      }),
    );
});

const getPaymentMethodBreakdownController = asyncHandler(async (req, res) => {
  const methods = await getPaymentMethodBreakdown();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Payment method breakdown fetched successfully", {
        methods,
      }),
    );
});

const exportRevenueCSV = asyncHandler(async (req, res) => {
  let days = Number(req.query.days) || 30;
  days = Math.min(Math.max(days, 1), 365);

  const csv = await generateRevenueCSV(days);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=revenue-${days}days.csv`,
  );
  return res.status(200).send(csv);
});

module.exports = {
  getSummary,
  getTopProductsController,
  getRevenueChart,
  getCategoryBreakdownController,
  getGeographicBreakdownController,
  getPaymentMethodBreakdownController,
  exportRevenueCSV,
};
