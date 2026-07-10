const User = require("../models/user.model");
const ApiError = require("./apiError");
const { getTokenStorageCandidates, hashToken } = require("./tokenHash");

const MAX_SESSIONS = 5; // cap concurrent devices per user

const generateAccessAndRefreshTokens = async (userId, oldRefreshToken = null) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store only token hashes. During rollout, also remove a legacy raw token
    // so existing sessions migrate seamlessly on their next rotation.
    if (oldRefreshToken) {
      const oldCandidates = new Set(getTokenStorageCandidates(oldRefreshToken));
      user.refreshToken = user.refreshToken.filter((token) => !oldCandidates.has(token));
    }

    user.refreshToken.push(hashToken(refreshToken));

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