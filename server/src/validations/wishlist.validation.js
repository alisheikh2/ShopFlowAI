const { param } = require("express-validator");

const productIdValidation = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid product ID"),
];

module.exports = {
  productIdValidation,
};