const asyncHandler = require("../utils/asyncHandler");
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

  res.status(201).json({
    success: true,
    statusCode: 201,
    message: "Category created successfully",
    data: {
      category,
    },
  });
});

// GET ALL 

const getAll = asyncHandler(async (req, res) => {
  const result = await getAllCategories(req.query);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Categories fetched successfully",
    data: result,
  });
});

// GET ONE 

const getOne = asyncHandler(async (req, res) => {
  const category = await getCategoryBySlug(req.params.slug);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Category fetched successfully",
    data: {
      category,
    },
  });
});

// UPDATE 

const update = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.slug, req.body);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Category updated successfully",
    data: {
      category,
    },
  });
});

// DELETE 

const remove = asyncHandler(async (req, res) => {
  await deleteCategory(req.params.slug);

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Category deleted successfully",
    data: null,
  });
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};