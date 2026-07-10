const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");

const addToWishlist = async (userId, productId) => {
  const product = await Product.findById(productId);

  if (!product || !product.isPublished) {
    throw new ApiError(404, "Product not found");
  }

  try {
    const wishlistItem = await Wishlist.create({
      user: userId,
      product: productId,
    });

    return wishlistItem;
  } catch (error) {
    // Unique index (user + product) race: two concurrent adds both
    // passed any pre-check and hit the DB at the same time.
    if (error.code === 11000) {
      throw new ApiError(409, "Product already exists in wishlist");
    }
    throw error;
  }
};

const removeFromWishlist = async (userId, productId) => {
  const wishlistItem = await Wishlist.findOneAndDelete({
    user: userId,
    product: productId,
  });

  if (!wishlistItem) {
    throw new ApiError(404, "Product not found in wishlist");
  }
};

const getUserWishlist = async (userId) => {
  const items = await Wishlist.find({ user: userId }).populate("product");

  const validItems = items.filter(
    (item) => item.product !== null && item.product.isPublished,
  );
  const invalidIds = items
    .filter((item) => item.product === null || !item.product.isPublished)
    .map((item) => item._id);

  if (invalidIds.length > 0) {
    await Wishlist.deleteMany({ _id: { $in: invalidIds } });
  }

  return validItems;
};

const checkWishlistStatus = async (userId, productId) => {
  const [product, wishlistItem] = await Promise.all([
    Product.findById(productId).select("isPublished"),
    Wishlist.findOne({ user: userId, product: productId }),
  ]);

  return Boolean(product?.isPublished && wishlistItem);
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  checkWishlistStatus,
};