const { body } = require("express-validator");

const createProductValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Product name must be between 3 and 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters long"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be greater than 0"),

  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount price cannot be negative"),

  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock cannot be negative"),

  body("brand")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Brand name cannot exceed 50 characters"),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be true or false"),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be true or false"),
];

module.exports = {
  createProductValidation,
};