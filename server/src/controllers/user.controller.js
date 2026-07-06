const { getAuth } = require("firebase-admin/auth");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleLogin,
} = require("../services/user.service");
const generateAccessAndRefreshTokens = require("../utils/generateTokens");
const cookieOptions = require("../constants/cookieOptions");
const sendEmail = require("../utils/sendEmail");
const { verificationEmailTemplate } = require("../utils/emailTemplates");

const register = asyncHandler(async (req, res) => {
  const { user, verificationToken } = await registerUser(req.body);

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your ShopFlow AI account",
    html: verificationEmailTemplate(user.name, verificationUrl),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      "Registration successful. Please check your email to verify your account.",
      {
        user,
      },
    ),
  );
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      user,
      accessToken,
    }),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken.id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token does not match");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id,
    );

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
      new ApiResponse(200, "Access token refreshed successfully", {
        accessToken,
      }),
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  );

  await logoutUser(decodedToken.id);

  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json(new ApiResponse(200, "Logout successful"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "Current user fetched successfully", {
      user: req.user,
    }),
  );
});

const googleLoginController = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Google ID token is required");
  }

  let decodedToken;

  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "Invalid Google ID token");
  }

  const user = await googleLogin(decodedToken);

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(200, "Google login successful", {
      user,
      accessToken,
    }),
  );
});

const verifyEmailController = asyncHandler(async (req, res) => {
  await verifyEmail(req.params.token);

  return res
    .status(200)
    .json(new ApiResponse(200, "Email verified successfully"));
});

const forgotPasswordController = asyncHandler(async (req, res) => {
  const { user, resetToken } = await forgotPassword(req.body.email);

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your ShopFlow AI password",
    html: `
      <h2>Password Reset</h2>
      <p>Hello ${user.name},</p>
      <p>Click the link below to reset your password:</p>

      <a href="${resetUrl}">
        Reset Password
      </a>

      <p>This link will expire in 1 hour.</p>
    `,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password reset email sent successfully"));
});

const resetPasswordController = asyncHandler(async (req, res) => {
  await resetPassword(req.params.token, req.body.password);

  return res
    .status(200)
    .json(new ApiResponse(200, "Password reset successfully"));
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  googleLoginController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
};
