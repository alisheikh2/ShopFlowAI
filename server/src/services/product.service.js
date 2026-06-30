const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");

const createProduct = async (productData, userId) => {
  const existingProduct = await Product.findOne({
    slug: productData.name.toLowerCase().trim().replace(/\s+/g, "-"),
  });

  if (existingProduct) {
    throw new ApiError(409, "A product with the same name already exists");
  }

  const slug = productData.name.toLowerCase().trim().replace(/\s+/g, "-");

  const product = await Product.create({
    ...productData,
    slug,
    createdBy: userId,
  });

  return product;
};

const getAllProducts = async () => {
  const products = await Product.find({
    isPublished: true,
  })
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");
  return products;
};

const getProductBySlug = async (slug) => {
     const product = await Product.findOne({ 
        slug,
        isPublished: true, 
    }).populate("createdBy", "name"); 
    if (!product) {
         throw new ApiError(404, "Product not found"); 
        } 
        return product;
     };

     
const updateProduct = async (slug, updateData) => {
  const product = await Product.findOne({
    slug,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Slug update if name changes
  if (updateData.name) {
    updateData.slug = updateData.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    product._id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("createdBy", "name");

  return updatedProduct;
};

const deleteProduct = async (slug) => {
  const product = await Product.findOne({
    slug,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await Product.findByIdAndDelete(product._id);

  return;
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
};