require("dotenv").config();
const mongoose = require("mongoose");
const stripe = require("../config/stripe");
const connectDB = require("../database/connectDB");
const Order = require("../models/order.model");
const { getReservationExpiry } = require("../services/reservation.service");

const migrate = async () => {
  try {
    await connectDB();

    const cancelledResult = await Order.updateMany(
      { orderStatus: "cancelled", inventoryStatus: { $exists: false } },
      { $set: { inventoryStatus: "released" } },
    );
    const codResult = await Order.updateMany(
      {
        paymentMethod: "cod",
        orderStatus: { $ne: "cancelled" },
        inventoryStatus: { $exists: false },
      },
      { $set: { inventoryStatus: "committed" } },
    );
    const paidStripeResult = await Order.updateMany(
      {
        paymentMethod: "stripe",
        paymentStatus: { $in: ["paid", "refunded"] },
        inventoryStatus: { $exists: false },
      },
      { $set: { inventoryStatus: "committed" } },
    );
    const pendingStripeResult = await Order.updateMany(
      {
        paymentMethod: "stripe",
        paymentStatus: { $in: ["pending", "failed"] },
        orderStatus: { $ne: "cancelled" },
        inventoryStatus: { $exists: false },
      },
      {
        $set: {
          inventoryStatus: "reserved",
          paymentExpiresAt: getReservationExpiry(),
        },
      },
    );

    const legacyIntents = await Order.find({
      paymentMethod: "stripe",
      paymentIntentId: { $ne: "" },
      $or: [
        { paymentAmountMinor: { $exists: false } },
        { paymentAmountMinor: null },
      ],
    });

    let quoted = 0;
    for (const order of legacyIntents) {
      const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      if (
        intent.metadata?.orderId !== order._id.toString() ||
        intent.metadata?.userId !== order.user.toString()
      ) {
        throw new Error(`Stripe metadata mismatch for legacy order ${order._id}`);
      }
      order.paymentAmountMinor = intent.amount;
      order.paymentCurrency = intent.currency;
      order.paymentExchangeRate =
        order.totalAmount > 0 ? intent.amount / 100 / order.totalAmount : undefined;
      await order.save({ validateBeforeSave: false });
      quoted += 1;
    }

    await Order.createIndexes();

    console.log({
      cancelledUpdated: cancelledResult.modifiedCount,
      codUpdated: codResult.modifiedCount,
      paidStripeUpdated: paidStripeResult.modifiedCount,
      pendingStripeUpdated: pendingStripeResult.modifiedCount,
      legacyStripeQuotesUpdated: quoted,
    });
  } catch (error) {
    console.error("Phase 1 order migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void migrate();
