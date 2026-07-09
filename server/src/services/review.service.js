const Review = require("../models/review.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");

const ApiError = require("../utils/apiError");

const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });

  const numReviews = reviews.length;

  const ratings =
    numReviews === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / numReviews;

  await Product.findByIdAndUpdate(productId, {
    ratings: Number(ratings.toFixed(1)),
    numReviews,
  });
};

const createReview = async (userId, data) => {
  const { productId, rating, comment } = data;

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const hasPurchased = await Order.exists({
    user: userId,
    orderStatus: "delivered",
    "items.product": product._id,
  });

  if (!hasPurchased) {
    throw new ApiError(
      403,
      "You can only review products you have purchased and received",
    );
  }

  const existingReview = await Review.findOne({
    user: userId,
    product: productId,
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  try {
    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment,
    });

    await updateProductRating(productId);

    return review;
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, "You have already reviewed this product");
    }
    throw error;
  }
};

const getProductReviews = async (slug) => {
  const product = await Product.findOne({ slug });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const reviews = await Review.find({
    product: product._id,
  })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 });

  return {
    reviews,
    averageRating: product.ratings,
    totalReviews: product.numReviews,
  };
};

const updateReview = async (reviewId, userId, data) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (review.user.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only update your own review");
  }

  if (data.rating !== undefined) {
    review.rating = data.rating;
  }

  if (data.comment !== undefined) {
    review.comment = data.comment;
  }

  await review.save();

  await updateProductRating(review.product);

  return review;
};

const deleteReview = async (reviewId, userId, role) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  const isOwner = review.user.toString() === userId.toString();
  const isAdmin = role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You can only delete your own review");
  }

  const productId = review.product;

  await review.deleteOne();

  await updateProductRating(productId);
};

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
};
