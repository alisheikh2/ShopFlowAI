const { param } = require("express-validator");

const mongoIdParamValidation = (paramName = "id") => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
];

module.exports = { mongoIdParamValidation };