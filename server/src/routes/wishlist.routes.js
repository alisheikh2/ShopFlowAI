const express = require("express");

const {
  addToWishlistController,
  removeFromWishlistController,
  getUserWishlistController,
  checkWishlistStatusController,
} = require("../controllers/wishlist.controller");

const verifyJWT = require("../middleware/verifyJWT");
const validateRequest = require("../middleware/validateRequest");

const {
  productIdValidation,
} = require("../validations/wishlist.validation");

const router = express.Router();

router.post(
  "/:productId",
  verifyJWT,
  productIdValidation,
  validateRequest,
  addToWishlistController
);

router.delete(
  "/:productId",
  verifyJWT,
  productIdValidation,
  validateRequest,
  removeFromWishlistController,
);

router.get(
  "/",
  verifyJWT,
  getUserWishlistController
);

router.get(
  "/status/:productId",
  verifyJWT,
  productIdValidation,
  validateRequest,
  checkWishlistStatusController
);

module.exports = router;