const Category = require("../models/category.model");
const ApiError = require("../utils/apiError");

const generateSlug = (name) =>
  name.toLowerCase().trim().replace(/\s+/g, "-");

// CREATE 

const createCategory = async (categoryData, userId) => {
  const slug = generateSlug(categoryData.name);

  const existingCategory = await Category.findOne({ slug });

  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({
    ...categoryData,
    slug,
    createdBy: userId,
  });

  return category.populate("createdBy", "name");
};

// GET ALL

const getAllCategories = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const filter = {};

  // Search
  if (query.search) {
    filter.name = {
      $regex: query.search,
      $options: "i",
    };
  }

  // Active Filter

  if (query.active !== undefined) {
    filter.isActive = query.active === "true";
  }

  // Featured Filter

  if (query.featured !== undefined) {
    filter.isFeatured = query.featured === "true";
  }

  // Sorting

  let sortOption = { createdAt: -1 };

  const sortMap = {
    name: { name: 1 },
    "-name": { name: -1 },
    createdAt: { createdAt: 1 },
    "-createdAt": { createdAt: -1 },
  };

  if (query.sort && sortMap[query.sort]) {
    sortOption = sortMap[query.sort];
  }

  const totalCategories = await Category.countDocuments(filter);

  const totalPages = Math.max(1, Math.ceil(totalCategories / limit));

  const categories = await Category.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name");

  return {
    categories,
    pagination: {
      totalCategories,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

// GET SINGLE 

const getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({
    slug,
  }).populate("createdBy", "name");

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category;
};

// UPDATE 

const updateCategory = async (slug, updateData) => {
  const category = await Category.findOne({ slug });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (updateData.name) {
    updateData.slug = generateSlug(updateData.name);

    const existingCategory = await Category.findOne({
      slug: updateData.slug,
      _id: { $ne: category._id },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category name already exists");
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    category._id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("createdBy", "name");

  return updatedCategory;
};

// DELETE 

const deleteCategory = async (slug) => {
  const category = await Category.findOne({ slug });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await Category.findByIdAndDelete(category._id);
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};