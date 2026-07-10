const mongoose = require("mongoose");
const stripe = require("../config/stripe");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const StripeEvent = require("../models/stripeEvent.model");
const ApiError = require("../utils/apiError");
const { getPKRtoUSDQuote } = require("../utils/currencyConverter");
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");
const { releaseOrderReservation } = require("./reservation.service");
const { enqueueRefund } = require("./outbox.service");
const emailNotificationService = require("./emailNotification.service");
const invoiceService = require("./invoice.service");

const getOrderForEmail = async (orderId) =>
  await Order.findById(orderId)
    .populate("user", "name email")
    .populate(
      "items.product",
      "name slug images description sku stock price discountPrice",
    );

const isExpired = (order) =>
  order.paymentExpiresAt && order.paymentExpiresAt.getTime() <= Date.now();

const validatePaymentIntentForOrder = (order, paymentIntent) => {
  if (!order.paymentIntentId || order.paymentIntentId !== paymentIntent.id) {
    return "PaymentIntent ID does not match the order";
  }
  if (paymentIntent.metadata?.orderId !== order._id.toString()) {
    return "PaymentIntent order metadata does not match";
  }
  if (paymentIntent.metadata?.userId !== order.user.toString()) {
    return "PaymentIntent user metadata does not match";
  }
  if (!Number.isSafeInteger(order.paymentAmountMinor)) {
    return "Order does not contain an immutable payment quote";
  }
  if (paymentIntent.amount !== order.paymentAmountMinor) {
    return "PaymentIntent amount does not match the order quote";
  }
  if (
    paymentIntent.status === "succeeded" &&
    Number.isSafeInteger(paymentIntent.amount_received) &&
    paymentIntent.amount_received !== order.paymentAmountMinor
  ) {
    return "PaymentIntent received amount does not match the order quote";
  }
  if (
    String(paymentIntent.currency || "").toLowerCase() !==
    String(order.paymentCurrency || "").toLowerCase()
  ) {
    return "PaymentIntent currency does not match the order quote";
  }
  return null;
};

const establishPaymentQuote = async (order) => {
  if (Number.isSafeInteger(order.paymentAmountMinor)) return order;

  // Backward-compatible deployment path: a legacy order may already have a
  // server-created PaymentIntent but no persisted quote fields. Stripe is the
  // source of truth for that already-created attempt after metadata checks.
  if (order.paymentIntentId) {
    const legacyIntent = await getExistingIntent(order);
    if (legacyIntent) {
      if (
        legacyIntent.metadata?.orderId !== order._id.toString() ||
        legacyIntent.metadata?.userId !== order.user.toString() ||
        !Number.isSafeInteger(legacyIntent.amount) ||
        legacyIntent.amount < 1
      ) {
        throw new ApiError(409, "Existing Stripe payment metadata is invalid");
      }

      const migratedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          $or: [
            { paymentAmountMinor: { $exists: false } },
            { paymentAmountMinor: null },
          ],
        },
        {
          $set: {
            paymentAmountMinor: legacyIntent.amount,
            paymentCurrency: legacyIntent.currency,
            paymentExchangeRate:
              order.totalAmount > 0
                ? legacyIntent.amount / 100 / order.totalAmount
                : undefined,
          },
        },
        { new: true },
      );
      return migratedOrder || (await Order.findById(order._id));
    }
  }

  const quote = await getPKRtoUSDQuote(order.totalAmount);
  const quotedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      $or: [
        { paymentAmountMinor: { $exists: false } },
        { paymentAmountMinor: null },
      ],
    },
    {
      $set: {
        paymentAmountMinor: quote.amountMinor,
        paymentCurrency: quote.currency,
        paymentExchangeRate: quote.rate,
      },
    },
    { new: true },
  );

  return quotedOrder || (await Order.findById(order._id));
};

const getExistingIntent = async (order) => {
  try {
    return await stripe.paymentIntents.retrieve(order.paymentIntentId);
  } catch (error) {
    if (error.code === "resource_missing") return null;
    throw new ApiError(502, "Unable to retrieve the existing Stripe payment");
  }
};

const createPaymentIntent = async (orderId, userId) => {
  let order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.user.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to access this order");
  }
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
    throw new ApiError(400, "Order has already been paid");
  }
  if (order.paymentMethod !== "stripe") {
    throw new ApiError(400, "This order cannot be paid using Stripe");
  }

  if (
    order.orderStatus === "cancelled" ||
    order.inventoryStatus !== "reserved" ||
    isExpired(order)
  ) {
    if (order.inventoryStatus === "reserved") {
      await releaseOrderReservation(order._id);
    }
    throw new ApiError(410, "Payment reservation has expired");
  }

  order = await establishPaymentQuote(order);
  if (order.paymentAmountMinor < 50) {
    throw new ApiError(
      400,
      "Order total is below Stripe's minimum charge amount.",
    );
  }

  if (order.paymentIntentId) {
    const existingIntent = await getExistingIntent(order);
    if (existingIntent) {
      const validationError = validatePaymentIntentForOrder(order, existingIntent);
      if (validationError) throw new ApiError(409, validationError);

      if (existingIntent.status !== "canceled") {
        return {
          clientSecret: existingIntent.client_secret,
          status: existingIntent.status,
          expiresAt: order.paymentExpiresAt,
        };
      }
    }

    const previousIntentId = order.paymentIntentId;
    const resetOrder = await Order.findOneAndUpdate(
      { _id: order._id, paymentIntentId: previousIntentId },
      {
        $set: { paymentIntentId: "", transactionReference: "" },
        $inc: { paymentAttempt: 1 },
      },
      { new: true },
    );

    order = resetOrder || (await Order.findById(order._id));
    if (order?.paymentIntentId) {
      // A concurrent request has already established the replacement attempt.
      return await createPaymentIntent(orderId, userId);
    }
  }

  if (!order) throw new ApiError(404, "Order not found");
  const attempt = order.paymentAttempt || 1;
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: order.paymentAmountMinor,
      currency: order.paymentCurrency,
      payment_method_types: ["card"],
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        attempt: String(attempt),
      },
    },
    { idempotencyKey: `order:${order._id}:payment-attempt:${attempt}` },
  );

  const savedOrder = await Order.findOneAndUpdate(
    { _id: order._id, paymentIntentId: "" },
    {
      $set: {
        paymentIntentId: paymentIntent.id,
        transactionReference: paymentIntent.id,
        paymentStatus: "pending",
        lastPaymentError: "",
      },
    },
    { new: true },
  );

  if (!savedOrder) {
    const current = await Order.findById(order._id);
    if (current?.paymentIntentId !== paymentIntent.id) {
      throw new ApiError(409, "A different payment attempt is already active");
    }
  }

  return {
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status,
    expiresAt: order.paymentExpiresAt,
  };
};

const recordStripeEvent = async (
  event,
  { order, outcome, reason = "" },
  session,
) => {
  await StripeEvent.create(
    [
      {
        eventId: event.id,
        type: event.type,
        paymentIntentId: event.data?.object?.id || "",
        order: order?._id,
        outcome,
        reason,
      },
    ],
    { session },
  );
};

const sendPaidSideEffects = async (orderId) => {
  const order = await getOrderForEmail(orderId);
  if (!order) return;

  if (order.user?.email) {
    await emailNotificationService.sendPaymentSuccessEmail(order);
    if (!order.invoiceEmailSentAt) {
      try {
        await invoiceService.sendOrderInvoiceEmail(order);
      } catch (error) {
        console.error(`Paid invoice email failed for order ${order._id}:`, error.message);
      }
    }
  }
  await emailNotificationService.sendAdminNewOrderEmail(order);
  await emailNotificationService.sendLowStockAlertsForOrder(order);
};

const handleStripeWebhook = async (event) => {
  if (!event?.id || !event?.type) {
    throw new ApiError(400, "Malformed Stripe event");
  }

  const existing = await StripeEvent.findOne({ eventId: event.id }).lean();
  if (existing) return { duplicate: true, outcome: existing.outcome };

  const paymentIntent = event.data?.object;
  const orderId = paymentIntent?.metadata?.orderId;
  const session = await mongoose.startSession();
  let result = { outcome: "ignored" };
  let paidOrderId;
  let failedOrderId;

  try {
    await session.withTransaction(async () => {
      if (
        !["payment_intent.succeeded", "payment_intent.payment_failed"].includes(
          event.type,
        )
      ) {
        await recordStripeEvent(
          event,
          { outcome: "ignored", reason: "Unrelated event type" },
          session,
        );
        result = { outcome: "ignored" };
        return;
      }

      if (!orderId || !mongoose.isValidObjectId(orderId)) {
        await recordStripeEvent(
          event,
          { outcome: "rejected", reason: "Missing or invalid order metadata" },
          session,
        );
        result = { outcome: "rejected" };
        return;
      }

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        await recordStripeEvent(
          event,
          { outcome: "rejected", reason: "Order not found" },
          session,
        );
        result = { outcome: "rejected" };
        return;
      }

      const validationError = validatePaymentIntentForOrder(order, paymentIntent);
      if (validationError) {
        await recordStripeEvent(
          event,
          { order, outcome: "rejected", reason: validationError },
          session,
        );
        result = { outcome: "rejected", reason: validationError };
        return;
      }

      if (event.type === "payment_intent.succeeded") {
        order.transactionReference = paymentIntent.id;

        if (order.paymentStatus === "refunded") {
          result = { outcome: "ignored", reason: "Order is already refunded" };
        } else if (
          order.orderStatus === "cancelled" ||
          order.inventoryStatus === "released"
        ) {
          // A charge completed after cancellation/expiry. Never revive the
          // order or consume inventory: queue an idempotent compensating refund.
          order.paymentStatus = "paid";
          order.refundStatus = "pending";
          order.refundRequestedAt = new Date();
          await order.save({ session });
          await enqueueRefund(order, session);
          result = { outcome: "processed", refundQueued: true };
        } else if (order.paymentStatus === "paid") {
          result = { outcome: "processed", alreadyPaid: true };
        } else {
          order.paymentStatus = "paid";
          order.orderStatus = "processing";
          order.inventoryStatus = "committed";
          order.lastPaymentError = "";
          await order.save({ session });

          const cart = await Cart.findOne({ user: order.user }).session(session);
          if (cart) {
            for (const orderedItem of order.items) {
              const cartItem = cart.items.find(
                (item) =>
                  item.product.toString() === orderedItem.product.toString(),
              );
              if (!cartItem) continue;

              if (cartItem.quantity <= orderedItem.quantity) {
                cart.items = cart.items.filter(
                  (item) =>
                    item.product.toString() !== orderedItem.product.toString(),
                );
              } else {
                cartItem.quantity -= orderedItem.quantity;
              }
            }
            await cart.save({ session });
          }
          paidOrderId = order._id;
          result = { outcome: "processed", paid: true };
        }
      } else if (
        !["paid", "refunded"].includes(order.paymentStatus) &&
        order.orderStatus !== "cancelled"
      ) {
        order.paymentStatus = "failed";
        order.lastPaymentError = String(
          paymentIntent.last_payment_error?.message || "Stripe payment failed",
        ).slice(0, 500);
        await order.save({ session });
        failedOrderId = order._id;
        result = { outcome: "processed", failed: true };
      } else {
        result = {
          outcome: "ignored",
          reason: "Terminal order state cannot be downgraded",
        };
      }

      await recordStripeEvent(
        event,
        { order, outcome: result.outcome, reason: result.reason || "" },
        session,
      );
    });
  } catch (error) {
    if (error.code === 11000) {
      return { duplicate: true, outcome: "processed" };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  await invalidateCacheGroups(["analytics"]);

  if (paidOrderId) await sendPaidSideEffects(paidOrderId);
  if (failedOrderId) {
    const order = await getOrderForEmail(failedOrderId);
    if (order?.user?.email) {
      await emailNotificationService.sendPaymentFailedEmail(order);
    }
  }

  return result;
};

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
  validatePaymentIntentForOrder,
};
