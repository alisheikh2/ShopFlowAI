const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../services/cart.service");

const add = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const cart = await addToCart(req.user._id, productId, quantity);

  res.status(201).json(
    new ApiResponse(201, "Product added to cart successfully", { cart })
  );
});

const get = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);

  res.status(200).json(
    new ApiResponse(200, "Cart fetched successfully", { cart })
  );
});

const update = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cart = await updateCartItem(req.user._id, req.params.productId, quantity);

  res.status(200).json(
    new ApiResponse(200, "Cart updated successfully", { cart })
  );
});

const remove = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.user._id, req.params.productId);

  res.status(200).json(
    new ApiResponse(200, "Product removed from cart successfully", { cart })
  );
});

const clear = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.user._id);

  res.status(200).json(
    new ApiResponse(200, "Cart cleared successfully", { cart })
  );
});

module.exports = {
  add,
  get,
  update,
  remove,
  clear,
};