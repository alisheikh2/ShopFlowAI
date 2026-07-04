const { body } = require("express-validator");

const addToCartValidation = [
  body("productId")
    .notEmpty()
    .withMessage("Product is required")
    .isMongoId()
    .withMessage("Invalid product id"),

  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

const updateCartValidation = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

module.exports = {
  addToCartValidation,
  updateCartValidation,
};