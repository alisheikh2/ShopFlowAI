const User = require("../models/user.model");
const ApiError = require("../utils/apiError");

const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -__v"
  );

  return createdUser;
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

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -__v"
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
    }
  );
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};