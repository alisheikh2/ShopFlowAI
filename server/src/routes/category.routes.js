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

const { cacheResponse, getCacheTTL } = require("../middleware/cache.middleware");
const {
  buildCategoriesListKey,
  buildCategoryDetailKey,
} = require("../utils/cacheKeys");
const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();

const categoriesListTTL = getCacheTTL(process.env.CACHE_TTL_CATEGORIES, 600);
const categoryDetailTTL = getCacheTTL(process.env.CACHE_TTL_CATEGORY_DETAIL, 600);

// Public Routes

router.get("/", cacheResponse(categoriesListTTL, buildCategoriesListKey), getAll);

router.get("/:slug", cacheResponse(categoryDetailTTL, buildCategoryDetailKey), getOne);

// Admin Routes

router.post(
  "/",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  createCategoryValidation,
  validateRequest,
  create,
);

router.put(
  "/:slug",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  updateCategoryValidation,
  validateRequest,
  update,
);

router.delete(
  "/:slug",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  remove,
);

module.exports = router;
