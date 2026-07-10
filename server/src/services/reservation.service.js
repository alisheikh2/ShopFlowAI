const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { enqueuePaymentIntentCancellation } = require("./outbox.service");
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");

const getReservationMinutes = () => {
  const value = Number(process.env.PAYMENT_RESERVATION_MINUTES);
  return Number.isFinite(value) && value >= 5 ? value : 30;
};

const getReservationExpiry = () =>
  new Date(Date.now() + getReservationMinutes() * 60 * 1000);

const releaseOrderReservation = async (
  orderId,
  { reason = "Payment reservation expired" } = {},
) => {
  const session = await mongoose.startSession();
  let releasedOrder = null;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        paymentMethod: "stripe",
        inventoryStatus: "reserved",
        paymentStatus: { $nin: ["paid", "refunded"] },
        orderStatus: { $in: ["pending", "processing"] },
      }).session(session);

      if (!order) return;

      const stockOperations = order.items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: item.quantity } },
        },
      }));

      if (stockOperations.length > 0) {
        await Product.bulkWrite(stockOperations, { session });
      }

      order.inventoryStatus = "released";
      order.orderStatus = "cancelled";
      order.paymentStatus = "failed";
      order.lastPaymentError = reason;
      await order.save({ session });
      await enqueuePaymentIntentCancellation(order, session);
      releasedOrder = order;
    });
  } finally {
    await session.endSession();
  }

  if (releasedOrder) {
    await invalidateCacheGroups(["products", "analytics"]);
  }

  return releasedOrder;
};

const expireAbandonedReservations = async ({ limit = 50 } = {}) => {
  const expiredOrders = await Order.find({
    paymentMethod: "stripe",
    inventoryStatus: "reserved",
    paymentStatus: { $nin: ["paid", "refunded"] },
    orderStatus: { $in: ["pending", "processing"] },
    paymentExpiresAt: { $lte: new Date() },
  })
    .select("_id")
    .sort({ paymentExpiresAt: 1 })
    .limit(limit)
    .lean();

  let released = 0;
  for (const order of expiredOrders) {
    const result = await releaseOrderReservation(order._id);
    if (result) released += 1;
  }

  return released;
};

module.exports = {
  expireAbandonedReservations,
  getReservationExpiry,
  getReservationMinutes,
  releaseOrderReservation,
};
