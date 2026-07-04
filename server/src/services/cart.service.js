const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");


const addToCart = async (userId, productId, quantity = 1) => {
  const product = await Product.findById(productId);

  if (!product || !product.isPublished) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw new ApiError(
      400,
      `Only ${product.stock} item(s) available in stock`
    );
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  const currentPrice =
    product.discountPrice > 0
      ? product.discountPrice
      : product.price;

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > product.stock) {
      throw new ApiError(
        400,
        `Only ${product.stock} item(s) available in stock`
      );
    }

    existingItem.quantity = newQuantity;
    existingItem.priceSnapshot = currentPrice;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      priceSnapshot: currentPrice,
    });
  }

  await cart.save();

  return await getCart(userId);
};


const getCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!cart) {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  // Remove deleted/unpublished products automatically
  cart.items = cart.items.filter(
    (item) => item.product && item.product.isPublished
  );

  await cart.save();

  const subtotal = cart.items.reduce(
    (total, item) =>
      total + item.priceSnapshot * item.quantity,
    0
  );

  const totalItems = cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return {
    items: cart.items,
    totalItems,
    subtotal,
  };
};


const updateCartItem = async (
  userId,
  productId,
  quantity
) => {
  if (quantity < 1) {
    throw new ApiError(
      400,
      "Quantity must be at least 1"
    );
  }

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const item = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (!item) {
    throw new ApiError(404, "Product not found in cart");
  }

  const product = await Product.findById(productId);

  if (!product || !product.isPublished) {
    throw new ApiError(404, "Product not found");
  }

  if (quantity > product.stock) {
    throw new ApiError(
      400,
      `Only ${product.stock} item(s) available in stock`
    );
  }

  item.quantity = quantity;

  item.priceSnapshot =
    product.discountPrice > 0
      ? product.discountPrice
      : product.price;

  await cart.save();

  return await getCart(userId);
};


const removeCartItem = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const exists = cart.items.some(
    (item) => item.product.toString() === productId
  );

  if (!exists) {
    throw new ApiError(404, "Product not found in cart");
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  await cart.save();

  return await getCart(userId);
};


// Clear User Cart
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.items = [];

  await cart.save();

  return {
    items: [],
    totalItems: 0,
    subtotal: 0,
  };
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};