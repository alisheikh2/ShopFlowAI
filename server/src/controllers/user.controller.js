const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("../services/user.service");
const generateAccessAndRefreshTokens = require("../utils/generateTokens");
const cookieOptions = require("../constants/cookieOptions");

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      user,
    })
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
     console.log("🔥 Controller HIT");
      console.log(req.user);
  return res.status(200).json(
    new ApiResponse(200, "Current user fetched successfully", {
      user: req.user,
    })
  );
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};