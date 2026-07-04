const { body } = require("express-validator");

const createOrderValidation = [
  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),

  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required"),

  body("shippingAddress.address")
    .trim()
    .notEmpty()
    .withMessage("Address is required"),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("shippingAddress.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required"),

  body("shippingAddress.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required"),

  body("paymentMethod")
    .optional()
    .isIn(["cod", "stripe"])
    .withMessage("Invalid payment method"),
];

const updateOrderStatusValidation = [
  body("orderStatus")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Order status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation,
};
