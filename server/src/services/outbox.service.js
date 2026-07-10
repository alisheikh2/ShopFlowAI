const stripe = require("../config/stripe");
const Order = require("../models/order.model");
const OutboxEvent = require("../models/outboxEvent.model");
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");

const MAX_ATTEMPTS = 8;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const enqueueRefund = async (order, session) => {
  if (!order.paymentIntentId) return null;

  const idempotencyKey = `refund:${order._id}:${order.paymentIntentId}`;
  await OutboxEvent.updateOne(
    { idempotencyKey },
    {
      $setOnInsert: {
        type: "stripe.refund.requested",
        aggregateId: order._id,
        idempotencyKey,
        payload: {
          orderId: order._id.toString(),
          paymentIntentId: order.paymentIntentId,
        },
        status: "pending",
        availableAt: new Date(),
      },
    },
    { upsert: true, session },
  );

  return idempotencyKey;
};

const enqueuePaymentIntentCancellation = async (order, session) => {
  if (!order.paymentIntentId) return null;

  const idempotencyKey = `cancel-intent:${order._id}:${order.paymentIntentId}`;
  await OutboxEvent.updateOne(
    { idempotencyKey },
    {
      $setOnInsert: {
        type: "stripe.payment_intent.cancel.requested",
        aggregateId: order._id,
        idempotencyKey,
        payload: {
          orderId: order._id.toString(),
          paymentIntentId: order.paymentIntentId,
        },
        status: "pending",
        availableAt: new Date(),
      },
    },
    { upsert: true, session },
  );

  return idempotencyKey;
};

const claimNextEvent = async () => {
  const now = new Date();
  const staleLock = new Date(Date.now() - LOCK_TIMEOUT_MS);

  return await OutboxEvent.findOneAndUpdate(
    {
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { status: "pending", availableAt: { $lte: now } },
        { status: "processing", lockedAt: { $lte: staleLock } },
      ],
    },
    {
      $set: { status: "processing", lockedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { availableAt: 1, createdAt: 1 } },
  );
};

const processRefundEvent = async (event) => {
  const order = await Order.findById(event.payload.orderId);
  if (!order) throw new Error(`Refund order ${event.payload.orderId} not found`);

  if (order.refundStatus === "succeeded") {
    return { alreadyCompleted: true, refundId: order.refundId };
  }
  if (
    order.paymentIntentId !== event.payload.paymentIntentId ||
    order.orderStatus !== "cancelled" ||
    order.paymentStatus !== "paid" ||
    !["pending", "processing", "failed"].includes(order.refundStatus)
  ) {
    throw new Error(`Order ${order._id} is not eligible for this refund event`);
  }

  order.refundStatus = "processing";
  await order.save({ validateBeforeSave: false });

  const refund = await stripe.refunds.create(
    { payment_intent: event.payload.paymentIntentId },
    { idempotencyKey: event.idempotencyKey },
  );

  await Order.findByIdAndUpdate(order._id, {
    paymentStatus: "refunded",
    refundStatus: "succeeded",
    refundId: refund.id,
    refundFailureReason: "",
  });
  await invalidateCacheGroups(["analytics"]);

  return { refundId: refund.id };
};

const processPaymentIntentCancellation = async (event) => {
  const order = await Order.findById(event.payload.orderId);
  if (!order) {
    throw new Error(`Cancellation order ${event.payload.orderId} not found`);
  }
  if (order.paymentIntentId !== event.payload.paymentIntentId) {
    throw new Error(`PaymentIntent changed for order ${order._id}`);
  }
  if (order.paymentStatus === "paid" || order.refundStatus === "pending") {
    return { ignored: true, reason: "Payment completed; refund workflow owns it" };
  }
  if (order.orderStatus !== "cancelled" || order.inventoryStatus !== "released") {
    throw new Error(`Order ${order._id} is not eligible for intent cancellation`);
  }

  try {
    return await stripe.paymentIntents.cancel(
      event.payload.paymentIntentId,
      {},
      { idempotencyKey: event.idempotencyKey },
    );
  } catch (error) {
    // A succeeded/already-cancelled intent cannot be cancelled. A late success
    // is handled by the webhook, which queues an idempotent refund.
    if (
      error.code === "payment_intent_unexpected_state" ||
      error.code === "resource_missing"
    ) {
      return { ignored: true, reason: error.code };
    }
    throw error;
  }
};

const processOutboxEvent = async (event) => {
  if (event.type === "stripe.refund.requested") {
    return await processRefundEvent(event);
  }
  if (event.type === "stripe.payment_intent.cancel.requested") {
    return await processPaymentIntentCancellation(event);
  }
  throw new Error(`Unsupported outbox event type: ${event.type}`);
};

const markCompleted = async (event) => {
  await OutboxEvent.findByIdAndUpdate(event._id, {
    status: "completed",
    completedAt: new Date(),
    lockedAt: null,
    lastError: "",
  });
};

const markFailedOrRetry = async (event, error) => {
  const exhausted = event.attempts >= MAX_ATTEMPTS;
  const delaySeconds = Math.min(2 ** event.attempts * 15, 60 * 60);

  await OutboxEvent.findByIdAndUpdate(event._id, {
    status: exhausted ? "failed" : "pending",
    availableAt: new Date(Date.now() + delaySeconds * 1000),
    lockedAt: null,
    lastError: String(error.message || error).slice(0, 1000),
  });

  if (event.type === "stripe.refund.requested") {
    await Order.findByIdAndUpdate(event.aggregateId, {
      refundStatus: exhausted ? "failed" : "pending",
      refundFailureReason: String(error.message || error).slice(0, 500),
    });
  }
};

const processPendingOutboxEvents = async ({ limit = 10 } = {}) => {
  let processed = 0;

  while (processed < limit) {
    const event = await claimNextEvent();
    if (!event) break;

    try {
      await processOutboxEvent(event);
      await markCompleted(event);
    } catch (error) {
      console.error(`Outbox event ${event._id} failed:`, error.message);
      await markFailedOrRetry(event, error);
    }

    processed += 1;
  }

  return processed;
};

module.exports = {
  enqueuePaymentIntentCancellation,
  enqueueRefund,
  processPendingOutboxEvents,
};
