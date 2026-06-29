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
    "-password -refreshToken -__v"
  );

  return createdUser;
};

module.exports = {
  registerUser,
};