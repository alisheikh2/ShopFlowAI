const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const verifyJWT = asyncHandler(async (req, res, next) => {
    
  const authHeader = req.header("Authorization");
   

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Access token missing");
  }

  const accessToken = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id).select(
      "-password -refreshToken -__v"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired access token");
  }
});

module.exports = verifyJWT;
