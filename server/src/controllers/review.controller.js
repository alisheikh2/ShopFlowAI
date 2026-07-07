const asyncHandler = require("../utils/asyncHandler");
const reviewService = require("../services/review.service");
const ApiResponse = require("../utils/apiResponse");

const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.body);

   return res.status(201).json(
  new ApiResponse(
    201,
    "Review added successfully",
    {
      review,
    }
  )
);
});

const getAll = asyncHandler(async (req, res) => {
  const result = await reviewService.getProductReviews(req.params.slug);

  return res
    .status(200)
    .json(new ApiResponse(200, "Reviews fetched successfully", result));
});

const update = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReview(
    req.params.id,
    req.user._id,
    req.body,
  );

  return res.status(200).json(
    new ApiResponse(200, "Review updated successfully", {
      review,
    }),
  );
});

const remove = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user._id, req.user.role);

  return res
    .status(200)
    .json(new ApiResponse(200, "Review deleted successfully", null));
});

module.exports = {
  create,
  getAll,
  update,
  remove,
};