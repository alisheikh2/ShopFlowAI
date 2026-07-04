const Product = require("../models/product.model");
const Category = require("../models/category.model");
const ApiError = require("../utils/apiError");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");

const createProduct = async (productData, userId) => {
  // Check category exists
  const category = await Category.findById(productData.category);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Generate slug
  const slug = productData.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  // Check duplicate product BEFORE uploading images
  const existingProduct = await Product.findOne({ slug });

  if (existingProduct) {
    throw new ApiError(409, "A product with the same name already exists");
  }

  // Upload images
  let uploadedImages = [];

  if (productData.images?.length) {
    for (const image of productData.images) {
      const uploaded = await uploadToCloudinary(
  image,
  "shopflow/products"
);

uploadedImages.push({
  public_id: uploaded.public_id,
  url: uploaded.secure_url,
});
    }
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
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {
    isPublished: true,
  };

  // Search
  if (query.search) {
    filter.name = {
      $regex: query.search,
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

  // Update slug
  // Update slug + check duplicate
if (updateData.name) {
  updateData.slug = updateData.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  const existingProduct = await Product.findOne({
    slug: updateData.slug,
    _id: { $ne: product._id },
  });

  if (existingProduct) {
    throw new ApiError(
      409,
      "A product with the same name already exists"
    );
  }
}

if (updateData.images?.length) {

  // Delete old images
  for (const image of product.images) {
    await deleteFromCloudinary(image.public_id);
  }

  const uploadedImages = [];

  for (const image of updateData.images) {
    const uploaded = await uploadToCloudinary(
      image,
      "shopflow/products"
    );

    uploadedImages.push({
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    });
  }

  updateData.images = uploadedImages;
}

  
  const updatedProduct = await Product.findByIdAndUpdate(
    product._id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
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
   {
  if (product.images?.length) {
  await Promise.all(
    product.images.map((image) =>
      deleteFromCloudinary(image.public_id)
    )
  );
}
}


  await Product.findByIdAndDelete(product._id);
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
};