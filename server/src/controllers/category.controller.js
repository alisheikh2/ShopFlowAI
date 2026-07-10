const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} = require("../services/category.service");

// CREATE
const create = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body, req.user.id);

  res.status(201).json(
    new ApiResponse(201, "Category created successfully", { category })
  );
});

// GET ALL
const getAll = asyncHandler(async (req, res) => {
  const result = await getAllCategories(req.query);

  res.status(200).json(
    new ApiResponse(200, "Categories fetched successfully", result)
  );
});

const getAllAdmin = asyncHandler(async (req, res) => {
  const result = await getAllCategories(req.query, { includeInactive: true });
  return res
    .status(200)
    .json(new ApiResponse(200, "Admin categories fetched successfully", result));
});

const getOneAdmin = asyncHandler(async (req, res) => {
  const category = await getCategoryBySlug(req.params.slug, { includeInactive: true });
  return res
    .status(200)
    .json(new ApiResponse(200, "Admin category fetched successfully", { category }));
});

// GET ONE
const getOne = asyncHandler(async (req, res) => {
  const category = await getCategoryBySlug(req.params.slug);

  res.status(200).json(
    new ApiResponse(200, "Category fetched successfully", { category })
  );
});

// UPDATE
const update = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.slug, req.body);

  res.status(200).json(
    new ApiResponse(200, "Category updated successfully", { category })
  );
});

// DELETE
const remove = asyncHandler(async (req, res) => {
  await deleteCategory(req.params.slug);

  res.status(200).json(
    new ApiResponse(200, "Category deleted successfully", null)
  );
});

module.exports = {
  create,
  getAll,
  getAllAdmin,
  getOne,
  getOneAdmin,
  update,
  remove,
};