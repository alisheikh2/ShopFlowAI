const express = require("express");
const ROLES = require("../constants/roles");

const {
  create,
  getAll,
  update,
  remove,
} = require("../controllers/review.controller");

const {
  createReviewValidation,
  updateReviewValidation,
} = require("../validations/review.validation");
const { mongoIdParamValidation } = require("../validations/commonValidation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

// Public Route
router.get("/product/:slug", getAll);

// Create — customer only (must have purchased the product)
router.post(
  "/",
  verifyJWT,
  verifyRole(ROLES.CUSTOMER),
  createReviewValidation,
  validateRequest,
  create
);

// Update — customer only (own review)
router.put(
  "/:id",
  verifyJWT,
  verifyRole(ROLES.CUSTOMER),
  mongoIdParamValidation("id"),
  updateReviewValidation,
  validateRequest,
  update
);

// Delete — customer (own review) OR admin (moderation)
router.delete(
  "/:id",
  verifyJWT,
  verifyRole(ROLES.CUSTOMER, ROLES.ADMIN),
  mongoIdParamValidation("id"),
  validateRequest,
  remove
);

module.exports = router;