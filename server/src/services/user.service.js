const crypto = require("crypto");

const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const generateSecureToken = require("../utils/generateSecureToken");

const EMAIL_VERIFICATION_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const { rawToken, hashedToken, expiry } = generateSecureToken(
    EMAIL_VERIFICATION_EXPIRY_MS,
  );

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: expiry,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -__v",
  );

  return {
    user: createdUser,
    verificationToken: rawToken,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -__v",
  );

  return loggedInUser;
};

const logoutUser = async (userId, refreshToken) => {
  await User.findByIdAndUpdate(
    userId,
    {
      $pull: { refreshToken: refreshToken },
    },
    {
      new: true,
    },
  );
};

const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification link");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = "";
  user.emailVerificationExpiry = undefined;

  await user.save({
    validateBeforeSave: false,
  });

  return user;
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  // Silently do nothing if user doesn't exist or isn't eligible —
  // caller (controller) always returns the same generic response either way.
  if (!user || !user.isEmailVerified) {
    return null;
  }

  const { rawToken, hashedToken, expiry } = generateSecureToken();

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = expiry;

  await user.save({
    validateBeforeSave: false,
  });

  return {
    user,
    resetToken: rawToken,
  };
};

const resetPassword = async (token, password) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset link");
  }

  user.password = password;
  // Revoke all existing sessions after password reset
  user.refreshToken = [];
  user.passwordResetToken = "";
  user.passwordResetExpiry = undefined;

  await user.save();

  return user;
};

const googleLogin = async (decodedToken) => {
  const { uid, email, name, picture } = decodedToken;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: crypto.randomBytes(32).toString("hex"),
      googleId: uid,
      authProvider: "google",
      isEmailVerified: true,
      avatar: {
        public_id: "",
        url: picture || "",
      },
    });
  } else {
    if (!user.googleId) {
      user.googleId = uid;
    }

    user.isEmailVerified = true;

    if (picture && !user.avatar.url) {
      user.avatar.url = picture;
    }

    await user.save({
      validateBeforeSave: false,
    });
  }

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -passwordResetToken -__v",
  );

  return loggedInUser;
};

const resendVerification = async (email) => {
  const user = await User.findOne({ email });

  // Silently no-op if user doesn't exist or is already verified —
  // controller always returns the same generic response either way.
  if (!user || user.isEmailVerified) {
    return null;
  }

  const { rawToken, hashedToken, expiry } = generateSecureToken(
    EMAIL_VERIFICATION_EXPIRY_MS,
  );

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = expiry;

  await user.save({
    validateBeforeSave: false,
  });

  return {
    user,
    verificationToken: rawToken,
  };
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleLogin,
  resendVerification,
};
