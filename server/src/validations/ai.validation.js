const { body } = require("express-validator");

const generateDescriptionValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required"),

  body("brand")
    .trim()
    .notEmpty()
    .withMessage("Brand is required"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number"),

  body("features")
    .isArray({ min: 1 })
    .withMessage("Features must be a non-empty array"),
];

module.exports = {
  generateDescriptionValidation,
};