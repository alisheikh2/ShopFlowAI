require("../test-support/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Category = require("../src/models/category.model");
const Product = require("../src/models/product.model");
const Cart = require("../src/models/cart.model");
const Order = require("../src/models/order.model");
const StripeEvent = require("../src/models/stripeEvent.model");
const OutboxEvent = require("../src/models/outboxEvent.model");
const orderService = require("../src/services/order.service");
const paymentService = require("../src/services/payment.service");
const reservationService = require("../src/services/reservation.service");
const outboxService = require("../src/services/outbox.service");
const emailService = require("../src/services/emailNotification.service");
const invoiceService = require("../src/services/invoice.service");
const stripe = require("../src/config/stripe");

for (const name of [
  "sendOrderConfirmationEmail",
  "sendAdminNewOrderEmail",
  "sendLowStockAlertsForOrder",
  "sendOrderStatusUpdateEmail",
  "sendPaymentSuccessEmail",
  "sendPaymentFailedEmail",
]) {
  emailService[name] = async () => true;
}
invoiceService.sendOrderInvoiceEmail = async () => true;
stripe.refunds.create = async () => ({ id: `re_test_${crypto.randomUUID()}` });
stripe.paymentIntents.cancel = async () => ({ status: "canceled" });

const address = {
  fullName: "Commerce Test",
  phone: "+923001234567",
  address: "Test Street",
  city: "okara",
  postalCode: "56300",
  country: "Pakistan",
};

const stripeEvent = (id, type, order, paymentIntentId, status = "succeeded") => ({
  id,
  type,
  data: {
    object: {
      id: paymentIntentId,
      amount: order.paymentAmountMinor,
      amount_received: status === "succeeded" ? order.paymentAmountMinor : 0,
      currency: order.paymentCurrency,
      status,
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      },
      last_payment_error:
        status === "succeeded" ? null : { message: "Test decline" },
    },
  },
});

let replset;

test.before(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri("commerce_lifecycle_integration"));
});

test.after(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

test("reservation, webhook idempotency, cancellation and refund saga preserve stock", async () => {
  const user = await User.create({
    name: "Commerce Test",
    email: "commerce@example.com",
    password: "Strong!Pass123",
    isEmailVerified: true,
  });
  const category = await Category.create({
    name: "Commerce",
    slug: "commerce",
    description: "A category used to verify the complete commerce lifecycle.",
    createdBy: user._id,
  });
  const product = await Product.create({
    name: "Commerce Product",
    slug: "commerce-product",
    description: "A valid product used by the commerce integration test.",
    price: 1000,
    stock: 10,
    category: category._id,
    createdBy: user._id,
  });
  await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: 2, priceSnapshot: 1000 }],
  });

  const checkoutId = crypto.randomUUID();
  const first = await orderService.createOrder(user._id, {
    shippingAddress: address,
    paymentMethod: "stripe",
    checkoutId,
  });
  const duplicate = await orderService.createOrder(user._id, {
    shippingAddress: address,
    paymentMethod: "stripe",
    checkoutId,
  });
  assert.equal(first._id.toString(), duplicate._id.toString());
  assert.equal((await Product.findById(product._id)).stock, 8);

  await assert.rejects(
    orderService.createOrder(user._id, {
      shippingAddress: address,
      paymentMethod: "stripe",
      checkoutId: crypto.randomUUID(),
    }),
    /active card-payment reservation/,
  );

  await Order.findByIdAndUpdate(first._id, {
    paymentExpiresAt: new Date(Date.now() - 1000),
  });
  await reservationService.releaseOrderReservation(first._id);
  assert.equal((await Product.findById(product._id)).stock, 10);

  let paid = await orderService.createOrder(user._id, {
    shippingAddress: address,
    paymentMethod: "stripe",
    checkoutId: crypto.randomUUID(),
  });
  paid = await Order.findByIdAndUpdate(
    paid._id,
    {
      paymentIntentId: "pi_paid_test",
      paymentAmountMinor: 500,
      paymentCurrency: "usd",
    },
    { new: true },
  );
  await Cart.updateOne(
    { user: user._id, "items.product": product._id },
    { $set: { "items.$.quantity": 3 } },
  );

  const success = stripeEvent(
    "evt_paid_test",
    "payment_intent.succeeded",
    paid,
    "pi_paid_test",
  );
  assert.equal((await paymentService.handleStripeWebhook(success)).paid, true);
  assert.equal((await paymentService.handleStripeWebhook(success)).duplicate, true);
  assert.equal(await StripeEvent.countDocuments({ eventId: success.id }), 1);

  paid = await Order.findById(paid._id);
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.inventoryStatus, "committed");
  assert.equal((await Cart.findOne({ user: user._id })).items[0].quantity, 1);

  const staleFailure = stripeEvent(
    "evt_stale_failure_test",
    "payment_intent.payment_failed",
    paid,
    "pi_paid_test",
    "requires_payment_method",
  );
  assert.equal(
    (await paymentService.handleStripeWebhook(staleFailure)).outcome,
    "ignored",
  );
  assert.equal((await Order.findById(paid._id)).paymentStatus, "paid");

  await orderService.updateOrderStatus(paid._id, "cancelled", {
    userId: user._id,
    role: "customer",
  });
  paid = await Order.findById(paid._id);
  assert.equal(paid.inventoryStatus, "released");
  assert.equal(paid.refundStatus, "pending");
  assert.equal((await Product.findById(product._id)).stock, 10);
  assert.equal(
    await OutboxEvent.countDocuments({
      type: "stripe.refund.requested",
      aggregateId: paid._id,
    }),
    1,
  );

  await outboxService.processPendingOutboxEvents({ limit: 10 });
  paid = await Order.findById(paid._id);
  assert.equal(paid.paymentStatus, "refunded");
  assert.equal(paid.refundStatus, "succeeded");
});

test("late success on a cancelled order queues refund without reviving inventory", async () => {
  const user = await User.findOne({ email: "commerce@example.com" });
  const product = await Product.findOne({ slug: "commerce-product" });
  let order = await orderService.createOrder(user._id, {
    shippingAddress: address,
    paymentMethod: "stripe",
    checkoutId: crypto.randomUUID(),
  });
  order = await Order.findByIdAndUpdate(
    order._id,
    {
      paymentIntentId: "pi_late_test",
      paymentAmountMinor: 400,
      paymentCurrency: "usd",
    },
    { new: true },
  );
  await orderService.updateOrderStatus(order._id, "cancelled", {
    userId: user._id,
    role: "customer",
  });

  const result = await paymentService.handleStripeWebhook(
    stripeEvent(
      "evt_late_success_test",
      "payment_intent.succeeded",
      order,
      "pi_late_test",
    ),
  );
  assert.equal(result.refundQueued, true);

  order = await Order.findById(order._id);
  assert.equal(order.orderStatus, "cancelled");
  assert.equal(order.inventoryStatus, "released");
  assert.equal(order.refundStatus, "pending");
  assert.equal((await Product.findById(product._id)).stock, 10);

  await outboxService.processPendingOutboxEvents({ limit: 10 });
  order = await Order.findById(order._id);
  assert.equal(order.paymentStatus, "refunded");
  assert.equal(order.orderStatus, "cancelled");
});
