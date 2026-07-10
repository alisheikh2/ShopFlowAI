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
  resendVerification,
} = require("../services/user.service");
const generateAccessAndRefreshTokens = require("../utils/generateTokens");
const cookieOptions = require("../constants/cookieOptions");
const sendEmail = require("../utils/sendEmail");
const { verificationEmailTemplate,
        passwordResetEmailTemplate,
 } = require("../utils/emailTemplates");
 const getFirebaseAdmin = require("../utils/firebaseAdmin");

const getPublicClientUrl = () =>
  process.env.PUBLIC_CLIENT_URL ||
  String(process.env.CLIENT_URL || "").split(",")[0].trim();

const register = asyncHandler(async (req, res) => {
  const { user, verificationToken } = await registerUser(req.body);

  const verificationUrl = `${getPublicClientUrl()}/verify-email/${verificationToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your ShopFlow AI account",
      html: verificationEmailTemplate(user.name, verificationUrl),
    });
  } catch (emailError) {
    // Don't fail registration just because SMTP hiccuped — the user
    // account is already created; they can use /resend-verification.
    console.error("Failed to send verification email:", emailError.message);
  }

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

    if (!user.refreshToken.includes(incomingRefreshToken)) {
      throw new ApiError(401, "Refresh token does not match");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id,
      incomingRefreshToken,
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

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    await logoutUser(decodedToken.id, incomingRefreshToken);
  } catch {
    // Token is already invalid or expired.
    // Still continue clearing the cookie.
  }

  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json(new ApiResponse(200, "Logout successful"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const safeUser = {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatar: req.user.avatar,
    isEmailVerified: req.user.isEmailVerified,
  };

  return res.status(200).json(
    new ApiResponse(200, "Current user fetched successfully", {
      user: safeUser,
    }),
  );
});

const googleLoginController = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Google ID token is required");
  }

  getFirebaseAdmin();

  let decodedToken;

  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "Invalid Google ID token");
  }

  if (!decodedToken.email_verified) {
    throw new ApiError(401, "Google account email is not verified");
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
  const result = await forgotPassword(req.body.email);

  if (result) {
    const { user, resetToken } = result;
    const resetUrl = `${getPublicClientUrl()}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your ShopFlow AI password",
      html: passwordResetEmailTemplate(user.name, resetUrl),
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "If an account with that email exists, a password reset link has been sent.",
      ),
    );
});

const resetPasswordController = asyncHandler(async (req, res) => {
  await resetPassword(req.params.token, req.body.password);

  return res
    .status(200)
    .json(new ApiResponse(200, "Password reset successfully"));
});

const resendVerificationController = asyncHandler(async (req, res) => {
  const result = await resendVerification(req.body.email);

  if (result) {
    const { user, verificationToken } = result;
    const verificationUrl = `${getPublicClientUrl()}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your ShopFlow AI account",
        html: verificationEmailTemplate(user.name, verificationUrl),
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "If an account with that email exists and isn't verified, a new verification link has been sent.",
      ),
    );
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
  resendVerificationController,
};
