const express = require("express");

const {
  generateDescriptionController,
} = require("../controllers/ai.controller");

const {
  generateDescriptionValidation,
} = require("../validations/ai.validation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

router.post(
  "/generate-description",
  verifyJWT,
  verifyRole("admin"),
  generateDescriptionValidation,
  validateRequest,
  generateDescriptionController
);

module.exports = router;