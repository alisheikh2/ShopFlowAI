const express = require("express");

const { register } = require("../controllers/user.controller");
const { registerValidation } = require("../validations/user.validation");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
  "/register",
  registerValidation,
  validateRequest,
  register
);

module.exports = router;