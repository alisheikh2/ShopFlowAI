const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");

// Shape a cart document (already fetched/populated) into the response format,
// removing deleted/unpublished products and persisting only if something changed.
const formatCart = async (cart) => {
  const originalCount = cart.items.length;
  const previousPrices = new Map();

  cart.items = cart.items.filter(
    (item) => item.product && item.product.isPublished
  );

  for (const item of cart.items) {
    const currentPrice =
      item.product.discountPrice > 0
        ? item.product.discountPrice
        : item.product.price;
    if (Number(item.priceSnapshot) !== Number(currentPrice)) {
      previousPrices.set(item.product._id.toString(), item.priceSnapshot);
      item.priceSnapshot = currentPrice;
    }
  }

  const pricingUpdated = previousPrices.size > 0;
  if (cart.items.length !== originalCount || pricingUpdated) {
    await cart.save();
  }

  const subtotal = cart.items.reduce(
    (total, item) => total + item.priceSnapshot * item.quantity,
    0
  );

  const totalItems = cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const items = cart.items.map((item) => {
    const plainItem = item.toObject();
    const previousPrice = previousPrices.get(item.product._id.toString());
    return {
      ...plainItem,
      priceChanged: previousPrice !== undefined,
      previousPrice,
    };
  });

  return {
    items,
    totalItems,
    subtotal,
    pricingUpdated,
  };
};

const populateCart = (cart) =>
  cart.populate({
    path: "items.product",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

const addToCart = async (userId, productId, quantity = 1) => {
  const product = await Product.findById(productId);

  if (!product || !product.isPublished) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Only ${product.stock} item(s) available in stock`);
  }

  let cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true },
  );

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  const currentPrice =
    product.discountPrice > 0 ? product.discountPrice : product.price;

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > product.stock) {
      throw new ApiError(400, `Only ${product.stock} item(s) available in stock`);
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
  await populateCart(cart);

  return await formatCart(cart);
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
    return { items: [], totalItems: 0, subtotal: 0, pricingUpdated: false };
  }

  return await formatCart(cart);
};

const updateCartItem = async (userId, productId, quantity) => {
  if (quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
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
    throw new ApiError(400, `Only ${product.stock} item(s) available in stock`);
  }

  item.quantity = quantity;
  item.priceSnapshot =
    product.discountPrice > 0 ? product.discountPrice : product.price;

  await cart.save();
  await populateCart(cart);

  return await formatCart(cart);
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
  await populateCart(cart);

  return await formatCart(cart);
};

// Clear User Cart
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.items = [];
  await cart.save();

  return { items: [], totalItems: 0, subtotal: 0, pricingUpdated: false };
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};