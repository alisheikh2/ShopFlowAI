const User = require("../models/user.model");
const ApiError = require("./apiError");

const MAX_SESSIONS = 5; // cap concurrent devices per user

const generateAccessAndRefreshTokens = async (userId, oldRefreshToken = null) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // If rotating (called from /refresh-token), drop the old token first
    if (oldRefreshToken) {
      user.refreshToken = user.refreshToken.filter((t) => t !== oldRefreshToken);
    }

    user.refreshToken.push(refreshToken);

    // Cap to most recent N sessions — drop oldest if over limit
    if (user.refreshToken.length > MAX_SESSIONS) {
      user.refreshToken = user.refreshToken.slice(-MAX_SESSIONS);
    }

    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Token generation error:", error.message); // bonus: issue #35 fix too
    throw new ApiError(
      500,
      "Something went wrong while generating authentication tokens."
    );
  }
};

module.exports = generateAccessAndRefreshTokens;