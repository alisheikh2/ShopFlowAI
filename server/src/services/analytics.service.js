const Order = require("../models/order.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");

// ---------- Dashboard Summary (with AOV) ----------
const getDashboardSummary = async () => {
  const revenueAgg = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        paidOrders: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const paidOrders = revenueAgg[0]?.paidOrders || 0;

  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
  ]);

  return {
    totalRevenue,
    paidOrders,
    totalOrders,
    totalUsers,
    totalProducts,
    avgOrderValue:
      paidOrders > 0 ? Number((totalRevenue / paidOrders).toFixed(2)) : 0,
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};

// ---------- Growth Comparison (current period vs previous period) ----------
const getGrowthComparison = async (days = 30) => {
  const now = new Date();

  const currentStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (days - 1),
    ),
  );
  const previousStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (2 * days - 1),
    ),
  );
  const previousEnd = currentStart; // exclusive upper bound for previous period

  const [currentAgg, previousAgg] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: currentStart } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: previousStart, $lt: previousEnd },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const currentRevenue = currentAgg[0]?.revenue || 0;
  const currentOrders = currentAgg[0]?.orders || 0;
  const previousRevenue = previousAgg[0]?.revenue || 0;
  const previousOrders = previousAgg[0]?.orders || 0;

  const calcGrowth = (curr, prev) => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return null;
    return Number((((curr - prev) / prev) * 100).toFixed(2));
  };

  return {
    currentPeriod: { revenue: currentRevenue, orders: currentOrders },
    previousPeriod: { revenue: previousRevenue, orders: previousOrders },
    revenueGrowthPercent: calcGrowth(currentRevenue, previousRevenue),
    ordersGrowthPercent: calcGrowth(currentOrders, previousOrders),
  };
};

// ---------- Top Products ----------
const getTopProducts = async (limit = 5) => {
  return await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.nameSnapshot" },
        totalQuantitySold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$items.priceSnapshot", "$items.quantity"] },
        },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productExists",
      },
    },
    {
      $addFields: {
        isDeleted: { $eq: [{ $size: "$productExists" }, 0] },
      },
    },
    { $project: { productExists: 0 } },
  ]);
};

// ---------- Daily Revenue (supports both rolling "days" AND custom startDate/endDate) ----------
const getDailyRevenue = async ({
  days = 30,
  startDate: customStart,
  endDate: customEnd,
} = {}) => {
  let startDate, endDate;

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    endDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    startDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1),
      ),
    );
  }

  const results = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const filled = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().split("T")[0];
    const match = results.find((r) => r._id === dateStr);
    filled.push({
      date: dateStr,
      revenue: match?.revenue || 0,
      orders: match?.orders || 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return filled;
};

// ---------- Category Breakdown ----------
// Prefer the category name captured on the order item at purchase time
// (categorySnapshot). This keeps revenue correctly attributed even if a
// product/category is later edited or deleted. Older orders placed before
// categorySnapshot existed fall back to a live product/category lookup, and
// only genuinely un-linkable items land in "Uncategorized".
const getCategoryBreakdown = async () => {
  return await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "productInfo.category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        resolvedCategory: {
          $cond: [
            {
              $and: [
                { $ne: ["$items.categorySnapshot", null] },
                { $ne: ["$items.categorySnapshot", ""] },
              ],
            },
            "$items.categorySnapshot",
            { $ifNull: ["$categoryInfo.name", "Uncategorized"] },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$resolvedCategory",
        totalQuantitySold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$items.priceSnapshot", "$items.quantity"] },
        },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

// ---------- Geographic Breakdown (by city) ----------
const getGeographicBreakdown = async () => {
  const results = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: "$shippingAddress.city",
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return results.map((r) => ({
    city: r._id ? r._id.charAt(0).toUpperCase() + r._id.slice(1) : "Unknown",
    totalRevenue: r.totalRevenue,
    totalOrders: r.totalOrders,
  }));
};

// ---------- Payment Method Breakdown ----------
const getPaymentMethodBreakdown = async () => {
  return await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: "$paymentMethod",
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

// ---------- CSV Export (revenue chart data) ----------
const generateRevenueCSV = async (days = 30) => {
  const data = await getDailyRevenue({ days });
  const header = "Date,Revenue,Orders\n";
  const rows = data.map((d) => `${d.date},${d.revenue},${d.orders}`).join("\n");
  return header + rows;
};

module.exports = {
  getDashboardSummary,
  getGrowthComparison,
  getTopProducts,
  getDailyRevenue,
  getCategoryBreakdown,
  getGeographicBreakdown,
  getPaymentMethodBreakdown,
  generateRevenueCSV,
};
