const crypto = require("crypto");

const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const generateSecureToken = require("../utils/generateSecureToken");

const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const { rawToken, hashedToken, expiry } = generateSecureToken();

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

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(
    userId,
    {
      refreshToken: "",
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

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
};
