const stripe = require("../config/stripe");
const Order = require("../models/order.model");
const ApiError = require("../utils/apiError");
const { convertPKRtoUSD } = require("../utils/currencyConverter");
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");
const emailNotificationService = require("./emailNotification.service");

const getOrderForEmail = async (orderId) =>
  await Order.findById(orderId)
    .populate("user", "name email")
    .populate("items.product", "name slug images description sku stock price discountPrice");

const createPaymentIntent = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.user.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to access this order");
  }

  if (order.paymentStatus === "paid") {
    throw new ApiError(400, "Order has already been paid");
  }

  if (order.paymentMethod !== "stripe") {
    throw new ApiError(400, "This order cannot be paid using Stripe");
  }

  if (order.orderStatus === "cancelled") {
    throw new ApiError(400, "Cancelled orders cannot be paid");
  }

  const amount = await convertPKRtoUSD(order.totalAmount);

  if (amount < 50) {
    throw new ApiError(
      400,
      "Order total is below Stripe's minimum charge amount.",
    );
  }

  // Reuse existing PaymentIntent if it already exists
  if (order.paymentIntentId) {
    try {
      const existingPaymentIntent = await stripe.paymentIntents.retrieve(
        order.paymentIntentId,
      );

      if (!order.transactionReference) {
        order.transactionReference = existingPaymentIntent.id;
        await order.save({ validateBeforeSave: false });
      }

      return {
        clientSecret: existingPaymentIntent.client_secret,
      };
    } catch {
      // Existing PaymentIntent no longer exists.
      // Create a new one below.
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    metadata: {
      orderId: order._id.toString(),
      userId: userId.toString(),
    },
  });

  order.paymentIntentId = paymentIntent.id;
  order.transactionReference = paymentIntent.id;

  await order.save({
    validateBeforeSave: false,
  });

  return {
    clientSecret: paymentIntent.client_secret,
  };
};

const handleStripeWebhook = async (event) => {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;

      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        console.warn(
          `Webhook: order ${orderId} not found for succeeded payment_intent ${paymentIntent.id}`,
        );
        return;
      }

      if (order.paymentStatus === "paid") {
        break;
      }

      order.paymentStatus = "paid";
      order.orderStatus = "processing";
      order.transactionReference = paymentIntent.id;

      await order.save();

      await invalidateCacheGroups(["analytics"]);

      const paidOrderForEmail = await getOrderForEmail(order._id);
      if (paidOrderForEmail?.user?.email) {
        await emailNotificationService.sendPaymentSuccessEmail(paidOrderForEmail);
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;

      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        console.warn(
          `Webhook: order ${orderId} not found for failed payment_intent ${paymentIntent.id}`,
        );
        return;
      }

      order.paymentStatus = "failed";
      order.orderStatus = "pending";

      await order.save({
        validateBeforeSave: false,
      });

      await invalidateCacheGroups(["analytics"]);

      const failedOrderForEmail = await getOrderForEmail(order._id);
      if (failedOrderForEmail?.user?.email) {
        await emailNotificationService.sendPaymentFailedEmail(failedOrderForEmail);
      }

      break;
    }

    default:
      // Ignore unrelated Stripe events.
      break;
  }
};

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
};
