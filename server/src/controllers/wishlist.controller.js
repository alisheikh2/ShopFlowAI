const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");

const {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  checkWishlistStatus,
} = require("../services/wishlist.service");

const addToWishlistController = asyncHandler(async (req, res) => {
  const wishlistItem = await addToWishlist(
    req.user._id,
    req.params.productId
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      "Product added to wishlist",
      {
        wishlistItem,
      }
    )
  );
});

const removeFromWishlistController = asyncHandler(async (req, res) => {
  await removeFromWishlist(
    req.user._id,
    req.params.productId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Product removed from wishlist"
    )
  );
});

const getUserWishlistController = asyncHandler(async (req, res) => {
  const wishlist = await getUserWishlist(req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Wishlist fetched successfully",
      {
        wishlist,
      }
    )
  );
});

const checkWishlistStatusController = asyncHandler(async (req, res) => {
  const isWishlisted = await checkWishlistStatus(
    req.user._id,
    req.params.productId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Wishlist status fetched successfully",
      {
        isWishlisted,
      }
    )
  );
});

module.exports = {
  addToWishlistController,
  removeFromWishlistController,
  getUserWishlistController,
  checkWishlistStatusController,
};