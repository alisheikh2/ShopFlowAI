const crypto = require("crypto");

const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const generateSecureToken = require("../utils/generateSecureToken");
const { getTokenStorageCandidates } = require("../utils/tokenHash");
const { escapeRegex, getSafeLimit } = require("../utils/queryHelpers");

const EMAIL_VERIFICATION_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const ADMIN_SAFE_FIELDS =
  "-password -refreshToken -emailVerificationToken -passwordResetToken -__v";

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
  const user = await User.findOne({ email }).select("+password");

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

  if (user.isBanned) {
    throw new ApiError(403, "Your account has been suspended. Contact support for help.");
  }

  const loggedInUser = await User.findById(user._id).select(
    "-refreshToken -emailVerificationToken -__v",
  );

  return loggedInUser;
};

const logoutUser = async (userId, refreshToken) => {
  await User.findByIdAndUpdate(
    userId,
    {
      $pull: { refreshToken: { $in: getTokenStorageCandidates(refreshToken) } },
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

  const verifiedUser = await User.findById(user._id).select(
    "-refreshToken -__v -emailVerificationToken -emailVerificationExpiry -passwordResetToken -passwordResetExpiry",
  );

  return verifiedUser;
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user || !user.isEmailVerified) {
    return null;
  }

  const { rawToken, hashedToken, expiry } = generateSecureToken();

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = expiry;

  await user.save({
    validateBeforeSave: false,
  });

  const safeUser = await User.findById(user._id).select(
    "-refreshToken -__v -emailVerificationToken -emailVerificationExpiry -passwordResetToken -passwordResetExpiry",
  );

  return {
    user: safeUser,
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
  user.refreshToken = [];
  user.passwordResetToken = "";
  user.passwordResetExpiry = undefined;

  await user.save();

  const safeUser = await User.findById(user._id).select(
    "-refreshToken -__v -emailVerificationToken -emailVerificationExpiry -passwordResetToken -passwordResetExpiry",
  );

  return safeUser;
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

  const safeUser = await User.findById(user._id).select(
    "-refreshToken -__v -emailVerificationToken -emailVerificationExpiry -passwordResetToken -passwordResetExpiry",
  );

  return {
    user: safeUser,
    verificationToken: rawToken,
  };
};

// ─── Admin: user management ───────────────────────────────────────────────

const getAllUsersAdmin = async (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  if (query.role) {
    filter.role = query.role;
  }

  if (query.banned !== undefined) {
    filter.isBanned = query.banned === "true";
  }

  const totalUsers = await User.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

  const users = await User.find(filter)
    .select(ADMIN_SAFE_FIELDS)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    users,
    pagination: {
      totalUsers,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const updateUserRoleAdmin = async (targetUserId, role, requestingUserId) => {
  if (targetUserId === String(requestingUserId)) {
    throw new ApiError(400, "You cannot change your own role");
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });

  return User.findById(user._id).select(ADMIN_SAFE_FIELDS);
};

const updateUserBanStatusAdmin = async (
  targetUserId,
  isBanned,
  requestingUserId,
) => {
  if (targetUserId === String(requestingUserId)) {
    throw new ApiError(400, "You cannot ban or unban your own account");
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isBanned = isBanned;

  // Force logout everywhere by clearing active refresh-token sessions on ban.
  if (isBanned) {
    user.refreshToken = [];
  }

  await user.save({ validateBeforeSave: false });

  return User.findById(user._id).select(ADMIN_SAFE_FIELDS);
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
  getAllUsersAdmin,
  updateUserRoleAdmin,
  updateUserBanStatusAdmin,
};
