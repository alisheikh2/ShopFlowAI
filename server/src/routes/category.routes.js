const express = require("express");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
} = require("../controllers/category.controller");

const {
  createCategoryValidation,
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
  verifyRole("admin"),
  createCategoryValidation,
  validateRequest,
  create
);

router.put(
  "/:slug",
  verifyJWT,
  verifyRole("admin"),
  createCategoryValidation,
  validateRequest,
  update
);

router.delete(
  "/:slug",
  verifyJWT,
  verifyRole("admin"),
  remove
);

module.exports = router;