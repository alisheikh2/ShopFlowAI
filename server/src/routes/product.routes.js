const express = require("express");

const { create,
        getAll,
        getOne,
        update,
        remove,
 } = require("../controllers/product.controller");
const { 
  createProductValidation,
 } = require("../validations/product.validation");
const validateRequest = require("../middleware/validateRequest");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

const router = express.Router();


router.get("/", getAll);

router.get("/:slug", getOne);

router.post(
  "/",
  verifyJWT,
  verifyRole("admin"),
  createProductValidation,
  validateRequest,
  create
);

router.put(
  "/:slug",
  verifyJWT,
  verifyRole("admin"),
  createProductValidation,
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