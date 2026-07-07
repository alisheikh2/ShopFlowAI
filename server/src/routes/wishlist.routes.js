const express = require("express");
const ROLES = require("../constants/roles");

const {
  addToWishlistController,
  removeFromWishlistController,
  getUserWishlistController,
  checkWishlistStatusController,
} = require("../controllers/wishlist.controller");

const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const validateRequest = require("../middleware/validateRequest");

const { productIdValidation } = require("../validations/wishlist.validation");

const router = express.Router();

router.use(verifyJWT, verifyRole(ROLES.CUSTOMER));

router.post(
  "/:productId",
  productIdValidation,
  validateRequest,
  addToWishlistController,
);

router.delete(
  "/:productId",
  productIdValidation,
  validateRequest,
  removeFromWishlistController,
);

router.get("/", getUserWishlistController);

router.get(
  "/status/:productId",
  productIdValidation,
  validateRequest,
  checkWishlistStatusController,
);

module.exports = router;