const { body } = require("express-validator");

const createReviewValidation = [
  body("productId")
    .notEmpty()
    .withMessage("Product id is required")
    .isMongoId()
    .withMessage("Invalid product id"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Comment must be between 5 and 1000 characters"),
];

const updateReviewValidation = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .optional()
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage("Comment must be between 5 and 1000 characters"),
];

module.exports = {
  createReviewValidation,
  updateReviewValidation,
};