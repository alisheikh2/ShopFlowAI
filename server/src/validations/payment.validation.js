const { body } = require("express-validator");

const createPaymentIntentValidation = [
  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID"),
];

module.exports = {
  createPaymentIntentValidation,
};