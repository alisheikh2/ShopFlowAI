const express = require("express");
const ROLES = require("../constants/roles");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
} = require("../controllers/category.controller");

const {
  createCategoryValidation,
  updateCategoryValidation,
} = require("../validations/category.validation");

const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

// Public Routes

router.get("/", getAll);

router.get("/:slug", getOne);

// Admin Routes

router.post(
  "/",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  createCategoryValidation,
  validateRequest,
  create
);

router.put(
  "/:slug",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  updateCategoryValidation, 
  validateRequest,
  update
);

router.delete(
  "/:slug",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  remove
);

module.exports = router;