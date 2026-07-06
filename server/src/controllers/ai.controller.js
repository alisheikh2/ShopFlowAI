const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");

const {
  generateProductDescription,
} = require("../services/ai.service");

const generateDescriptionController = asyncHandler(async (req, res) => {
  const description = await generateProductDescription(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Product description generated successfully",
      {
        description,
      }
    )
  );
});

module.exports = {
  generateDescriptionController,
};