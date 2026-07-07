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
const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/", getAll);

//Admin routes
router.get("/admin/all", verifyJWT, verifyRole(ROLES.ADMIN), getAllAdmin);

router.get("/admin/:slug", verifyJWT, verifyRole(ROLES.ADMIN), getOneAdmin);

router.get("/:slug", getOne);

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