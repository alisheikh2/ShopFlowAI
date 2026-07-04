const express = require("express");

const {
  create,
  getMyOrders,
  getOne,
  getAll,
  updateStatus,
} = require("../controllers/order.controller");

const {
  createOrderValidation,
  updateOrderStatusValidation,
} = require("../validations/order.validation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();


// Customer Routes
router.post(
  "/",
  verifyJWT,
  verifyRole("customer"),
  createOrderValidation,
  validateRequest,
  create
);

router.get(
  "/my-orders",
  verifyJWT,
  verifyRole("customer"),
  getMyOrders
);

router.get(
  "/:id",
  verifyJWT,
  getOne
);


//Admin Routes
router.get(
  "/",
  verifyJWT,
  verifyRole("admin"),
  getAll
);

router.patch(
  "/:id/status",
  verifyJWT,
  verifyRole("admin"),
  updateOrderStatusValidation,
  validateRequest,
  updateStatus
);

module.exports = router;