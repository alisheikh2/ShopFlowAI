const Wishlist = require("../models/wishlist.model");
const ApiError = require("../utils/apiError");

const addToWishlist = async (userId, productId) => {
  const existingWishlistItem = await Wishlist.findOne({
    user: userId,
    product: productId,
  });

  if (existingWishlistItem) {
    throw new ApiError(
      409,
      "Product already exists in wishlist",
    );
  }

  const wishlistItem = await Wishlist.create({
    user: userId,
    product: productId,
  });

  return wishlistItem;
};

const removeFromWishlist = async (userId, productId) => {
  const wishlistItem = await Wishlist.findOneAndDelete({
    user: userId,
    product: productId,
  });

  if (!wishlistItem) {
    throw new ApiError(
      404,
      "Product not found in wishlist",
    );
  }
};

const getUserWishlist = async (userId) => {
  return await Wishlist.find({
    user: userId,
  }).populate("product");
};

const checkWishlistStatus = async (userId, productId) => {
  const wishlistItem = await Wishlist.findOne({
    user: userId,
    product: productId,
  });

  return Boolean(wishlistItem);
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  checkWishlistStatus,
};