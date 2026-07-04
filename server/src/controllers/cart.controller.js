const asyncHandler = require("../utils/asyncHandler");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../services/cart.service");


const add = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const cart = await addToCart(
    req.user._id,
    productId,
    quantity
  );

  res.status(201).json({
    success: true,
    statusCode: 201,
    message: "Product added to cart successfully",
    data: {
      cart,
    },
  });
});


const get = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Cart fetched successfully",
    data: {
      cart,
    },
  });
});


const update = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cart = await updateCartItem(
    req.user._id,
    req.params.productId,
    quantity
  );

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Cart updated successfully",
    data: {
      cart,
    },
  });
});


const remove = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(
    req.user._id,
    req.params.productId
  );

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Product removed from cart successfully",
    data: {
      cart,
    },
  });
});


const clear = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.user._id);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Cart cleared successfully",
    data: {
      cart,
    },
  });
});

module.exports = {
  add,
  get,
  update,
  remove,
  clear,
};