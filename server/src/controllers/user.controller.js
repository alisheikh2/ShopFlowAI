const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const { registerUser } = require("../services/user.service");

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      user,
    })
  );
});

module.exports = {
  register,
};