const express = require("express");

const router = express.Router();

const verifyJWT = require("../middleware/verifyJWT");

const validateRequest = require("../middleware/validateRequest");

const {
  createPaymentIntentValidation,
} = require("../validations/payment.validation");

const {
  createPaymentIntentController,
  stripeWebhookController,
} = require("../controllers/payment.controller");

router.post(
  "/webhook",
  stripeWebhookController
);

router.post(
  "/create-intent",
  verifyJWT,
  createPaymentIntentValidation,
  validateRequest,
  createPaymentIntentController
);

module.exports = router;