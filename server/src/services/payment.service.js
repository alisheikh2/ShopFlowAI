const stripe = require("../config/stripe");
const Order = require("../models/order.model");
const ApiError = require("../utils/apiError");
const { convertPKRtoUSD } = require("../utils/currencyConverter");

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
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",

    metadata: {
      orderId: order._id.toString(),
      userId: userId.toString(),
    },
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
        throw new ApiError(404, "Order not found");
      }

      if (order.paymentStatus === "paid") {
        break;
      }

      order.paymentStatus = "paid";
      order.orderStatus = "processing";

      await order.save();

      break;
    }

    default:
      break;
  }
};

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
};
