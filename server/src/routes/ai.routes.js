const express = require("express");
const ROLES = require("../constants/roles");

const {
  generateDescriptionController,
} = require("../controllers/ai.controller");

const {
  generateDescriptionValidation,
} = require("../validations/ai.validation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const { aiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/generate-description",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  aiLimiter,
  generateDescriptionValidation,
  validateRequest,
  generateDescriptionController
);

module.exports = router;