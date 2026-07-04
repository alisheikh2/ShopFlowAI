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
} = require("../services/user.service");
const generateAccessAndRefreshTokens = require("../utils/generateTokens");
const cookieOptions = require("../constants/cookieOptions");
const sendEmail = require("../utils/sendEmail");
const {
  verificationEmailTemplate,
} = require("../utils/emailTemplates");

const register = asyncHandler(async (req, res) => {
  const {
    user,
    verificationToken,
  } = await registerUser(req.body);

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your ShopFlow AI account",
    html: verificationEmailTemplate(
      user.name,
      verificationUrl
    ),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      "Registration successful. Please check your email to verify your account.",
      {
        user,
      }
    )
  );
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  res.cookie(
    "refreshToken",
    refreshToken,
    {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  );

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      user,
      accessToken,
    })
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
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken.id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token does not match");
    }

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
      new ApiResponse(200, "Access token refreshed successfully", {
        accessToken,
      })
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
    process.env.REFRESH_TOKEN_SECRET
  );

  await logoutUser(decodedToken.id);

  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json(
    new ApiResponse(200, "Logout successful")
  );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "Current user fetched successfully", {
      user: req.user,
    })
  );
});

const verifyEmailController = asyncHandler(async (req, res) => {
  await verifyEmail(req.params.token);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Email verified successfully"
    )
  );
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  verifyEmailController,
};