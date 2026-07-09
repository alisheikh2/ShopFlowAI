const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");

const orderService = require("../services/order.service");
const invoiceService = require("../services/invoice.service");

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(
    req.user._id,
    req.body
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      "Order placed successfully",
      {
        order,
      }
    )
  );
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getMyOrders(
    req.user._id
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Orders fetched successfully",
      {
        orders,
      }
    )
  );
});

const getOne = asyncHandler(async (req, res) => {
  const order = await orderService.getSingleOrder(
    req.params.id,
    req.user._id,
    req.user.role
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Order fetched successfully",
      {
        order,
      }
    )
  );
});

const getAll = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders(req.query); 

  return res.status(200).json(
    new ApiResponse(200, "All orders fetched successfully", result),
  );
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.body.orderStatus,
    { userId: req.user._id, role: req.user.role },
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Order status updated successfully",
      {
        order,
      }
    ),
  );
});

const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.id,
    "cancelled",
    { userId: req.user._id, role: req.user.role },
  );

  return res.status(200).json(
    new ApiResponse(200, "Order cancelled successfully", { order }),
  );
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const { invoiceNumber, pdfBuffer } = await invoiceService.getInvoicePdfForOrder(
    req.params.id,
    { userId: req.user._id, role: req.user.role },
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ShopFlowAI-Invoice-${invoiceNumber}.pdf"`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);

  return res.status(200).send(pdfBuffer);
});

module.exports = {
  create,
  getMyOrders,
  getOne,
  getAll,
  updateStatus,
  cancelMyOrder,
  downloadInvoice,
};