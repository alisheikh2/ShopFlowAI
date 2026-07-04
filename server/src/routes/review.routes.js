const express = require("express");

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

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

// Public Route
router.get("/product/:slug", getAll);


// Customer Routes
router.use(
  verifyJWT,
  verifyRole("customer")
);

router.post(
  "/",
  createReviewValidation,
  validateRequest,
  create
);

router.put(
  "/:id",
  updateReviewValidation,
  validateRequest,
  update
);

router.delete(
  "/:id",
  remove
);

module.exports = router;