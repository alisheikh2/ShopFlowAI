const mongoose = require("mongoose");
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
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");
const { enqueueCloudinaryImageDeletion } = require("./outbox.service");

const ALLOWED_PRODUCT_FIELDS = [
  "name",
  "sku",
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

const normalizeProductPayload = (productData) => {
  const normalized = { ...productData };

  for (const field of ["price", "discountPrice", "stock"]) {
    if (normalized[field] !== undefined && normalized[field] !== "") {
      normalized[field] = Number(normalized[field]);
    }
  }

  for (const field of ["isFeatured", "isPublished"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field] === "true";
    }
  }

  return normalized;
};

const deleteImagesBestEffort = async (images = []) => {
  await Promise.allSettled(
    images
      .map((image) => image?.public_id)
      .filter(Boolean)
      .map((publicId) => deleteFromCloudinary(publicId)),
  );
};

const uploadProductImages = async (images = []) => {
  if (images.length === 0) return [];

  const results = await Promise.allSettled(
    images.map((image) => uploadToCloudinary(image, "shopflow/products")),
  );
  const uploadedImages = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => ({
      public_id: result.value.public_id,
      url: result.value.secure_url,
    }));
  const failed = results.find((result) => result.status === "rejected");

  if (failed) {
    await deleteImagesBestEffort(uploadedImages);
    throw failed.reason;
  }
  return uploadedImages;
};

const createProduct = async (productData, userId) => {
  productData = normalizeProductPayload(pickAllowedFields(productData));

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

  if (productData.sku) {
    productData.sku = productData.sku.toUpperCase();
    const existingSku = await Product.findOne({ sku: productData.sku });

    if (existingSku) {
      throw new ApiError(409, "A product with the same SKU already exists");
    }
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

  const uploadedImages = await uploadProductImages(productData.images || []);

  let product;
  try {
    product = await Product.create({
      ...productData,
      slug,
      images: uploadedImages,
      createdBy: userId,
    });
  } catch (error) {
    // DB failure must not leave newly uploaded, unreferenced assets behind.
    await deleteImagesBestEffort(uploadedImages);
    throw error;
  }

  const populatedProduct = await product.populate([
    {
      path: "createdBy",
      select: "name",
    },
    {
      path: "category",
      select: "name slug",
    },
  ]);

  await invalidateCacheGroups(["products", "analytics"]);

  return populatedProduct;
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
    const searchPattern = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };
    filter.$or = [
      { name: searchPattern },
      { sku: searchPattern },
      { brand: searchPattern },
    ];
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
  updateData = normalizeProductPayload(pickAllowedFields(updateData));
  const product = await Product.findOne({ slug });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (updateData.sku) {
    updateData.sku = updateData.sku.toUpperCase();
    const existingSku = await Product.findOne({
      sku: updateData.sku,
      _id: { $ne: product._id },
    });

    if (existingSku) {
      throw new ApiError(409, "A product with the same SKU already exists");
    }
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

  const oldImages = product.images || [];
  let uploadedImages = [];
  if (updateData.images?.length) {
    uploadedImages = await uploadProductImages(updateData.images);
    updateData.images = uploadedImages;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const result = await Product.findOneAndUpdate(
        { _id: product._id, updatedAt: product.updatedAt },
        updateData,
        {
          new: true,
          runValidators: true,
          session,
        },
      );
      if (!result) {
        throw new ApiError(
          409,
          "Product changed while it was being edited. Reload and try again.",
        );
      }

      if (uploadedImages.length > 0 && oldImages.length > 0) {
        await enqueueCloudinaryImageDeletion(
          oldImages.map((image) => image.public_id),
          product._id,
          session,
        );
      }
    });
  } catch (error) {
    // The DB still references old images if the transaction fails.
    await deleteImagesBestEffort(uploadedImages);
    throw error;
  } finally {
    await session.endSession();
  }

  const updatedProduct = await Product.findById(product._id)
    .populate("createdBy", "name")
    .populate("category", "name slug");

  await invalidateCacheGroups(["products", "analytics"]);

  return updatedProduct;
};

const deleteProduct = async (slug) => {
  const product = await Product.findOne({ slug });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const currentProduct = await Product.findById(product._id).session(session);
      if (!currentProduct) throw new ApiError(404, "Product not found");

      await Product.findByIdAndDelete(currentProduct._id, { session });
      await Wishlist.deleteMany({ product: currentProduct._id }, { session });
      await Review.deleteMany({ product: currentProduct._id }, { session });
      await enqueueCloudinaryImageDeletion(
        (currentProduct.images || []).map((image) => image.public_id),
        currentProduct._id,
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  await invalidateCacheGroups(["products", "analytics"]);
};

const getAllProductsAdmin = async (query) => {
  const page = Number(query.page) || 1;
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {}; //

  // Search
  if (query.search) {
    const searchPattern = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };
    filter.$or = [
      { name: searchPattern },
      { sku: searchPattern },
      { brand: searchPattern },
    ];
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