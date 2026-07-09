const express = require("express");
const ROLES = require("../constants/roles");

const {
  create,
  getMyOrders,
  getOne,
  getAll,
  updateStatus,
  cancelMyOrder,
  downloadInvoice,
} = require("../controllers/order.controller");

const {
  createOrderValidation,
  updateOrderStatusValidation,
} = require("../validations/order.validation");
const { mongoIdParamValidation } = require("../validations/commonValidation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

// Customer Routes
router.post(
  "/",
  verifyJWT,
  verifyRole(ROLES.CUSTOMER),
  createOrderValidation,
  validateRequest,
  create,
);

router.get("/my-orders", verifyJWT, verifyRole(ROLES.CUSTOMER), getMyOrders);

router.get(
  "/:id/invoice",
  verifyJWT,
  mongoIdParamValidation("id"),
  validateRequest,
  downloadInvoice,
);

router.get(
  "/:id",
  verifyJWT,
  mongoIdParamValidation("id"),
  validateRequest,
  getOne,
);

router.patch(
  "/:id/cancel",
  verifyJWT,
  verifyRole(ROLES.CUSTOMER),
  mongoIdParamValidation("id"),
  validateRequest,
  cancelMyOrder,
);

//Admin Routes
router.get("/", verifyJWT, verifyRole(ROLES.ADMIN), getAll);

router.patch(
  "/:id/status",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  mongoIdParamValidation("id"),
  updateOrderStatusValidation,
  validateRequest,
  updateStatus,
);

module.exports = router;