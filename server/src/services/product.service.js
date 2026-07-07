const slugify = require("slugify");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Wishlist = require("../models/wishlist.model");
const Review = require("../models/review.model");
const ApiError = require("../utils/apiError");
const { escapeRegex, getSafeLimit } = require("../utils/queryHelpers");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");

const ALLOWED_PRODUCT_FIELDS = [
  "name",
  "description",
  "price",
  "discountPrice",
  "stock",
  "brand",
  "category",
  "isFeatured",
  "isPublished",
  "images",
];

const pickAllowedFields = (source) => {
  const picked = {};
  for (const field of ALLOWED_PRODUCT_FIELDS) {
    if (source[field] !== undefined) {
      picked[field] = source[field];
    }
  }
  return picked;
};

const createProduct = async (productData, userId) => {
  productData = pickAllowedFields(productData);

  // Business rule: discount price must be strictly less than the regular price
  if (
    productData.discountPrice &&
    productData.discountPrice >= productData.price
  ) {
    throw new ApiError(
      400,
      "Discount price must be less than the regular price",
    );
  }

  // Check category exists
  const category = await Category.findById(productData.category);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Generate slug
  const slug = slugify(productData.name, {
    lower: true,
    strict: true,
    trim: true,
  });
  // Check duplicate product BEFORE uploading images
  const existingProduct = await Product.findOne({ slug });

  if (existingProduct) {
    throw new ApiError(409, "A product with the same name already exists");
  }

  // Upload images
  let uploadedImages = [];

  if (productData.images?.length) {
    const uploads = await Promise.all(
      productData.images.map((image) =>
        uploadToCloudinary(image, "shopflow/products"),
      ),
    );

    uploadedImages = uploads.map((uploaded) => ({
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    }));
  }

  // Create product
  const product = await Product.create({
    ...productData,
    slug,
    images: uploadedImages,
    createdBy: userId,
  });

  return await product.populate([
    {
      path: "createdBy",
      select: "name",
    },
    {
      path: "category",
      select: "name slug",
    },
  ]);
};

const getAllProducts = async (query) => {
  const page = Number(query.page) || 1;
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {
    isPublished: true,
  };

  // Search
  if (query.search) {
    filter.name = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };
  }

  // Brand Filter
  if (query.brand) {
    filter.brand = query.brand;
  }

  // Category Filter
  if (query.category) {
    filter.category = query.category;
  }

  // Featured Filter
  if (query.featured !== undefined) {
    filter.isFeatured = query.featured === "true";
  }

  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

  // Default Sort
  let sortOption = { createdAt: -1 };

  switch (query.sort) {
    case "price":
      sortOption = { price: 1 };
      break;

    case "-price":
      sortOption = { price: -1 };
      break;

    case "name":
      sortOption = { name: 1 };
      break;

    case "-name":
      sortOption = { name: -1 };
      break;

    case "createdAt":
      sortOption = { createdAt: 1 };
      break;

    case "-createdAt":
      sortOption = { createdAt: -1 };
      break;
  }

  const products = await Product.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name")
    .populate("category", "name slug");

  return {
    products,
    pagination: {
      totalProducts,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const getProductBySlug = async (slug) => {
  const product = await Product.findOne({
    slug,
    isPublished: true,
  })
    .populate("createdBy", "name")
    .populate("category", "name slug");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const updateProduct = async (slug, updateData) => {
  updateData = pickAllowedFields(updateData);
  const product = await Product.findOne({ slug });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Validate category
  if (updateData.category) {
    const category = await Category.findById(updateData.category);

    if (!category) {
      throw new ApiError(404, "Category not found");
    }
  }

  // Business rule: discount price must be strictly less than the regular price.
  const effectivePrice = updateData.price ?? product.price;
  const effectiveDiscount = updateData.discountPrice ?? product.discountPrice;

  if (effectiveDiscount && effectiveDiscount >= effectivePrice) {
    throw new ApiError(
      400,
      "Discount price must be less than the regular price",
    );
  }

  // Update slug + check duplicate
  if (updateData.name) {
    updateData.slug = slugify(updateData.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    const existingProduct = await Product.findOne({
      slug: updateData.slug,
      _id: { $ne: product._id },
    });

    if (existingProduct) {
      throw new ApiError(409, "A product with the same name already exists");
    }
  }

  if (updateData.images?.length) {
    const oldImages = product.images; // keep reference before overwriting

    // Upload new images FIRST — if this fails, old images stay intact
    const uploads = await Promise.all(
      updateData.images.map((image) =>
        uploadToCloudinary(image, "shopflow/products"),
      ),
    );

    updateData.images = uploads.map((uploaded) => ({
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    }));

    if (oldImages?.length) {
      try {
        await Promise.all(
          oldImages.map((image) => deleteFromCloudinary(image.public_id)),
        );
      } catch (err) {
        console.error(
          "Failed to delete old product images from Cloudinary:",
          err.message,
        );
      }
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    product._id,
    updateData,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("createdBy", "name")
    .populate("category", "name slug");

  return updatedProduct;
};

const deleteProduct = async (slug) => {
  const product = await Product.findOne({ slug });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.images?.length) {
    await Promise.all(
      product.images.map((image) => deleteFromCloudinary(image.public_id)),
    );
  }

  await Promise.all([
    Product.findByIdAndDelete(product._id),
    Wishlist.deleteMany({ product: product._id }),
    Review.deleteMany({ product: product._id }),
  ]);
};

const getAllProductsAdmin = async (query) => {
  const page = Number(query.page) || 1;
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {}; //

  // Search
  if (query.search) {
    filter.name = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };
  }

  // Brand Filter
  if (query.brand) {
    filter.brand = query.brand;
  }

  // Category Filter
  if (query.category) {
    filter.category = query.category;
  }

  // Featured Filter
  if (query.featured !== undefined) {
    filter.isFeatured = query.featured === "true";
  }

  // Published Filter
  if (query.published !== undefined) {
    filter.isPublished = query.published === "true";
  }

  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

  let sortOption = { createdAt: -1 };

  switch (query.sort) {
    case "price":
      sortOption = { price: 1 };
      break;
    case "-price":
      sortOption = { price: -1 };
      break;
    case "name":
      sortOption = { name: 1 };
      break;
    case "-name":
      sortOption = { name: -1 };
      break;
    case "createdAt":
      sortOption = { createdAt: 1 };
      break;
    case "-createdAt":
      sortOption = { createdAt: -1 };
      break;
  }

  const products = await Product.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name")
    .populate("category", "name slug");

  return {
    products,
    pagination: {
      totalProducts,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const getProductBySlugAdmin = async (slug) => {
  const product = await Product.findOne({ slug })
    .populate("createdBy", "name")
    .populate("category", "name slug");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getProductBySlugAdmin,
};