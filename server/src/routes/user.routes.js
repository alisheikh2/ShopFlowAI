const express = require("express");
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  googleLoginController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
} = require("../controllers/user.controller");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../validations/user.validation");
const validateRequest = require("../middleware/validateRequest");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");

router.post(
  "/register",
  registerValidation,
  validateRequest,
  register
);

router.post(
  "/login",
  loginValidation,
  validateRequest,
  login
);

router.post(
  "/refresh-token",
  refreshAccessToken
);

router.post("/logout", logout);

router.get(
  "/me",
  verifyJWT,
  getCurrentUser
);

router.get(
  "/admin-test",
  verifyJWT,
  verifyRole("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin!",
    });
  }
);

router.post(
  "/google-login",
  googleLoginController
);

router.get(
  "/verify-email/:token",
  verifyEmailController
);

router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  forgotPasswordController
);

router.post(
  "/reset-password/:token",
  resetPasswordValidation,
  validateRequest,
  resetPasswordController
);

module.exports = router;