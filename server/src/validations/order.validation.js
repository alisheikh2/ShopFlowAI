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

  body("billingAddress.fullName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing full name cannot be empty"),

  body("billingAddress.phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing phone cannot be empty"),

  body("billingAddress.address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing address cannot be empty"),

  body("billingAddress.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing city cannot be empty"),

  body("billingAddress.postalCode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing postal code cannot be empty"),

  body("billingAddress.country")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Billing country cannot be empty"),

  body("deliveryMethod")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Delivery method must be between 2 and 80 characters"),

  body("transactionReference")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Transaction reference cannot exceed 120 characters"),

  body("paymentMethod")
    .optional()
    .isIn(["cod", "stripe"])
    .withMessage("Invalid payment method"),

  body("checkoutId")
    .notEmpty()
    .withMessage("checkoutId is required")
    .isUUID()
    .withMessage("checkoutId must be a valid UUID"),
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
