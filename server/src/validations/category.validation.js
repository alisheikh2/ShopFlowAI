const { body } = require("express-validator");

const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Category description is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Category description must be between 10 and 500 characters"),

  body("image")
    .optional()
    .trim()
    .isString()
    .withMessage("Image must be a string"),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be true or false"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

const updateCategoryValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category description cannot be empty")
    .isLength({ min: 10, max: 500 })
    .withMessage("Category description must be between 10 and 500 characters"),

  body("image")
    .optional()
    .trim()
    .isString()
    .withMessage("Image must be a string"),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be true or false"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

module.exports = {
  createCategoryValidation,
  updateCategoryValidation,
};
