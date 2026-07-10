const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret-at-least-32-characters";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-at-least-32-characters";
process.env.STRIPE_SECRET_KEY ||= "sk_test_placeholder";

const {
  validatePaymentIntentForOrder,
} = require("../src/services/payment.service");

const userId = new mongoose.Types.ObjectId();
const orderId = new mongoose.Types.ObjectId();

const makeOrder = (overrides = {}) => ({
  _id: orderId,
  user: userId,
  paymentIntentId: "pi_test_123",
  paymentAmountMinor: 1250,
  paymentCurrency: "usd",
  ...overrides,
});

const makeIntent = (overrides = {}) => ({
  id: "pi_test_123",
  amount: 1250,
  currency: "usd",
  metadata: {
    orderId: orderId.toString(),
    userId: userId.toString(),
  },
  ...overrides,
});

test("accepts a PaymentIntent that exactly matches the immutable order quote", () => {
  assert.equal(validatePaymentIntentForOrder(makeOrder(), makeIntent()), null);
});

test("rejects a stale PaymentIntent ID", () => {
  assert.match(
    validatePaymentIntentForOrder(makeOrder(), makeIntent({ id: "pi_stale" })),
    /ID does not match/,
  );
});

test("rejects an amount mismatch", () => {
  assert.match(
    validatePaymentIntentForOrder(makeOrder(), makeIntent({ amount: 1249 })),
    /amount does not match/,
  );
});

test("rejects a succeeded intent with a received-amount mismatch", () => {
  assert.match(
    validatePaymentIntentForOrder(
      makeOrder(),
      makeIntent({ status: "succeeded", amount_received: 1200 }),
    ),
    /received amount does not match/,
  );
});

test("rejects a currency mismatch", () => {
  assert.match(
    validatePaymentIntentForOrder(makeOrder(), makeIntent({ currency: "eur" })),
    /currency does not match/,
  );
});

test("rejects mismatched user metadata", () => {
  assert.match(
    validatePaymentIntentForOrder(
      makeOrder(),
      makeIntent({
        metadata: {
          orderId: orderId.toString(),
          userId: new mongoose.Types.ObjectId().toString(),
        },
      }),
    ),
    /user metadata does not match/,
  );
});

test("rejects orders without a persisted immutable quote", () => {
  assert.match(
    validatePaymentIntentForOrder(
      makeOrder({ paymentAmountMinor: undefined }),
      makeIntent(),
    ),
    /immutable payment quote/,
  );
});
