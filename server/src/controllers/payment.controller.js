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
  try {
    const signature = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await handleStripeWebhook(event);

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("WEBHOOK ERROR:");
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentIntentController,
  stripeWebhookController,
};