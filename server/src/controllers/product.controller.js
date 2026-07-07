const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getProductBySlugAdmin,
} = require("../services/product.service");

const create = asyncHandler(async (req, res) => {
  if (req.files?.length) {
    req.body.images = req.files.map((file) => {
      return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    });
  }

  const product = await createProduct(req.body, req.user._id);
  return res.status(201).json(
    new ApiResponse(201, "Product created successfully", {
      product,
    }),
  );
});

const getAll = asyncHandler(async (req, res) => {
  const result = await getAllProducts(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Products fetched successfully", result));
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
  if (req.files?.length) {
    req.body.images = req.files.map((file) => {
      return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    });
  }
  const product = await updateProduct(req.params.slug, req.body);

  return res.status(200).json(
    new ApiResponse(200, "Product updated successfully", {
      product,
    }),
  );
});

const remove = asyncHandler(async (req, res) => {
  await deleteProduct(req.params.slug);

  return res
    .status(200)
    .json(new ApiResponse(200, "Product deleted successfully"));
});

const getAllAdmin = asyncHandler(async (req, res) => {
  const result = await getAllProductsAdmin(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Products fetched successfully", result));
});

const getOneAdmin = asyncHandler(async (req, res) => {
  const product = await getProductBySlugAdmin(req.params.slug);

  return res
    .status(200)
    .json(new ApiResponse(200, "Product fetched successfully", { product }));
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
  getAllAdmin,
  getOneAdmin,
};
