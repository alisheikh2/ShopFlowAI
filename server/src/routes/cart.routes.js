const express = require("express");
const ROLES = require("../constants/roles");

const {
  add,
  get,
  update,
  remove,
  clear,
} = require("../controllers/cart.controller");

const {
  addToCartValidation,
  updateCartValidation,
} = require("../validations/cart.validation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

// Protected Customer Routes
router.use(
  verifyJWT,
  verifyRole(ROLES.CUSTOMER),
);

router.get("/", get);

router.post(
  "/",
  addToCartValidation,
  validateRequest,
  add
);

router.put(
  "/:productId",
  updateCartValidation,
  validateRequest,
  update
);

router.delete("/:productId", remove);

router.delete("/", clear);

module.exports = router;