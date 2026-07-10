const express = require("express");
const ROLES = require("../constants/roles");
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
  resendVerificationController,
  getAllUsersAdminController,
  updateUserRoleController,
  updateUserBanStatusController,
} = require("../controllers/user.controller");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation,
  updateUserRoleValidation,
  updateUserBanStatusValidation,
} = require("../validations/user.validation");
const { mongoIdParamValidation } = require("../validations/commonValidation");
const validateRequest = require("../middleware/validateRequest");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyRole = require("../middleware/verifyRole");
const {
  authLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
} = require("../middleware/rateLimiter");

router.post(
  "/register",
  authLimiter,
  registerValidation,
  validateRequest,
  register,
);

router.post("/login", authLimiter, loginValidation, validateRequest, login);

router.post("/refresh-token", refreshLimiter, refreshAccessToken);

router.post("/logout", logout);

router.get("/me", verifyJWT, getCurrentUser);

router.get("/admin-test", verifyJWT, verifyRole(ROLES.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Admin!",
  });
});

// Admin: user management
router.get(
  "/admin/all",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  getAllUsersAdminController,
);

router.patch(
  "/admin/:id/role",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  mongoIdParamValidation("id"),
  updateUserRoleValidation,
  validateRequest,
  updateUserRoleController,
);

router.patch(
  "/admin/:id/ban",
  verifyJWT,
  verifyRole(ROLES.ADMIN),
  mongoIdParamValidation("id"),
  updateUserBanStatusValidation,
  validateRequest,
  updateUserBanStatusController,
);

router.post("/google-login", googleLoginController);

router.get("/verify-email/:token", verifyEmailController);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordValidation,
  validateRequest,
  forgotPasswordController,
);

router.post(
  "/reset-password/:token",
  resetPasswordValidation,
  validateRequest,
  resetPasswordController,
);

router.post(
  "/resend-verification",
  forgotPasswordLimiter,
  resendVerificationValidation,
  validateRequest,
  resendVerificationController,
);

module.exports = router;
