const stripe = require("../config/stripe");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");

const {
  createPaymentIntent,
  handleStripeWebhook,
} = require("../services/payment.service");

const createPaymentIntentController = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const paymentIntent = await createPaymentIntent(orderId, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Payment intent created successfully",
        paymentIntent,
      ),
    );
});

const stripeWebhookController = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  // Step 1: verify signature — any failure here is ALWAYS a 400
  // (bad/missing secret, tampered payload, wrong raw-body config)
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("WEBHOOK SIGNATURE ERROR:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Step 2: run business logic — genuine unexpected failures should be
  // 500 so Stripe retries; expected "soft" cases (order not found) are
  // already handled inside handleStripeWebhook by returning normally.
  try {
    const result = await handleStripeWebhook(event);
    if (result?.outcome === "rejected") {
      console.error(
        `Stripe event ${event.id} rejected:`,
        result.reason || "validation failed",
      );
    }
    return res.status(200).json({ received: true, outcome: result?.outcome });
  } catch (error) {
    console.error("WEBHOOK HANDLER ERROR:", error.message);
    return res.status(500).json({ error: "Internal webhook error" });
  }
};

module.exports = {
  createPaymentIntentController,
  stripeWebhookController,
};
