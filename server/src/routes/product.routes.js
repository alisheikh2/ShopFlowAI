const express = require("express");
const ROLES = require("../constants/roles");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
  getAllAdmin,
  getOneAdmin,
} = require("../controllers/product.controller");
const {
  createProductValidation,
  updateProductValidation,
} = require("../validations/product.validation");
const { cacheResponse, getCacheTTL } = require("../middleware/cache.middleware");
const {
  buildProductDetailKey,
  buildProductsListKey,
} = require("../utils/cacheKeys");
const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

const productsListTTL = getCacheTTL(process.env.CACHE_TTL_PRODUCTS, 120);
const productDetailTTL = getCacheTTL(process.env.CACHE_TTL_PRODUCT_DETAIL, 300);

router.get("/", cacheResponse(productsListTTL, buildProductsListKey), getAll);

//Admin routes
router.get("/admin/all", verifyJWT, verifyRole(ROLES.ADMIN), getAllAdmin);

router.get("/admin/:slug", verifyJWT, verifyRole(ROLES.ADMIN), getOneAdmin);

router.get("/:slug", cacheResponse(productDetailTTL, buildProductDetailKey), getOne);

router.post(
  "/",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  upload.array("images", 5),
  createProductValidation,
  validateRequest,
  create,
);

router.put(
  "/:slug",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  upload.array("images", 5),
  updateProductValidation,
  validateRequest,
  update,
);

router.delete("/:slug", verifyJWT, verifyRole(ROLES.ADMIN), remove);

module.exports = router;
