const express = require("express");
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
} = require("../controllers/user.controller");
const {
  registerValidation,
  loginValidation,
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

// router.get(
//   "/admin-test",
//   verifyJWT,
//   verifyRole("admin"),
//   (req, res) => {
//     res.status(200).json({
//       success: true,
//       message: "Welcome Admin!",
//     });
//   }
// );

module.exports = router;