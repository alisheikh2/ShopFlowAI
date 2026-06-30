const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} = require("../services/product.service");

const create = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body, req.user._id);

  return res.status(201).json(
    new ApiResponse(201, "Product created successfully", {
      product,
    }),
  );
});

const getAll = asyncHandler(async (req, res) => {
  const products = await getAllProducts();
  return res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products,
    }),
  );
});

const getOne = asyncHandler(async (req, res) => {
  const product = await getProductBySlug(req.params.slug);
  return res.status(200).json(
    new ApiResponse(200, "Product fetched successfully", {
      product,
    }),
  );
});

const update = asyncHandler(async (req, res) => {
  const product = await updateProduct(
    req.params.slug,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Product updated successfully",
      {
        product,
      }
    )
  );
});

const remove = asyncHandler(async (req, res) => {
  await deleteProduct(req.params.slug);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Product deleted successfully"
    )
  );
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};
