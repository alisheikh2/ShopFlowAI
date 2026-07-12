const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");
const { getSafeLimit } = require("../utils/queryHelpers");
const { invalidateCacheGroups } = require("../utils/cacheInvalidation");
const invoiceConfig = require("../config/invoice");
const emailNotificationService = require("./emailNotification.service");
const invoiceService = require("./invoice.service");
const {
  getReservationExpiry,
  releaseOrderReservation,
} = require("./reservation.service");
const {
  enqueuePaymentIntentCancellation,
  enqueueRefund,
} = require("./outbox.service");

const roundMoney = (amount) => Math.round(Number(amount || 0) * 100) / 100;

const getProductSku = (product) => {
  if (product.sku) return product.sku;
  return `SKU-${product._id.toString().slice(-8).toUpperCase()}`;
};

const getBillingAddress = (billingAddress, shippingAddress) => {
  if (!billingAddress) return shippingAddress;
  return { ...shippingAddress, ...billingAddress };
};

const populateOrder = (query) =>
  query
    .populate("user", "name email")
    .populate(
      "items.product",
      "name slug images description sku stock price discountPrice",
    );

const findIdempotentOrder = async (userId, checkoutId) => {
  if (!checkoutId) return null;
  return await populateOrder(Order.findOne({ user: userId, checkoutId }));
};

const runCodOrderSideEffects = async (order) => {
  if (order.user?.email) {
    await emailNotificationService.sendOrderConfirmationEmail(order);
    try {
      await invoiceService.sendOrderInvoiceEmail(order);
    } catch (error) {
      console.error(`Invoice email failed for order ${order._id}:`, error.message);
    }
  }

  await emailNotificationService.sendAdminNewOrderEmail(order);
  await emailNotificationService.sendLowStockAlertsForOrder(order);
};

const createOrder = async (userId, data) => {
  const {
    shippingAddress,
    billingAddress,
    paymentMethod = "cod",
    deliveryMethod = invoiceConfig.defaultDeliveryMethod,
    transactionReference = "",
    checkoutId,
  } = data;

  const existingOrder = await findIdempotentOrder(userId, checkoutId);
  if (existingOrder) return existingOrder;

  if (paymentMethod === "stripe") {
    const expiredReservations = await Order.find({
      user: userId,
      paymentMethod: "stripe",
      inventoryStatus: "reserved",
      paymentStatus: { $nin: ["paid", "refunded"] },
      paymentExpiresAt: { $lte: new Date() },
    }).select("_id");

    for (const reservation of expiredReservations) {
      await releaseOrderReservation(reservation._id);
    }
  }

  const session = await mongoose.startSession();
  let orderId;
  let wasCreated = false;

  try {
    await session.withTransaction(async () => {
      if (checkoutId) {
        const duplicate = await Order.findOne({ user: userId, checkoutId }).session(
          session,
        );
        if (duplicate) {
          orderId = duplicate._id;
          wasCreated = false;
          return;
        }
      }

      if (paymentMethod === "stripe") {
        const activeReservation = await Order.findOne({
          user: userId,
          paymentMethod: "stripe",
          orderStatus: { $in: ["pending", "processing"] },
          inventoryStatus: "reserved",
          paymentExpiresAt: { $gt: new Date() },
        }).session(session);

        if (activeReservation) {
          throw new ApiError(
            409,
            "You already have an active card-payment reservation. Complete or cancel it from My Orders before starting another checkout.",
          );
        }
      }

      const cart = await Cart.findOne({ user: userId })
        .populate("items.product")
        .session(session);

      if (!cart || cart.items.length === 0) {
        throw new ApiError(400, "Cart is empty");
      }

      const orderItems = [];
      let subtotal = 0;
      let totalTax = 0;

      for (const item of cart.items) {
        if (!item.product) {
          throw new ApiError(
            400,
            "A product in your cart is no longer available. Refresh your cart and try again.",
          );
        }

        const product = await Product.findById(item.product._id)
          .populate("category", "name")
          .session(session);
        if (!product) {
          throw new ApiError(400, `${item.product.name} is no longer available`);
        }
        if (!product.isPublished) {
          throw new ApiError(400, `${product.name} is unavailable`);
        }

        const price =
          product.discountPrice > 0 ? product.discountPrice : product.price;
        const lineSubtotal = roundMoney(price * item.quantity);
        const lineTax = roundMoney(
          (lineSubtotal * invoiceConfig.taxRate) / 100,
        );

        subtotal += lineSubtotal;
        totalTax += lineTax;
        orderItems.push({
          product: product._id,
          nameSnapshot: product.name,
          skuSnapshot: getProductSku(product),
          imageSnapshot: product.images.length > 0 ? product.images[0].url : "",
          categorySnapshot: product.category?.name || "",
          priceSnapshot: price,
          quantity: item.quantity,
          taxSnapshot: lineTax,
        });
      }

      subtotal = roundMoney(subtotal);
      const shippingFee = 0;
      const tax = roundMoney(totalTax);
      const totalAmount = roundMoney(subtotal + shippingFee + tax);
      orderId = new mongoose.Types.ObjectId();

      const [order] = await Order.create(
        [
          {
            _id: orderId,
            user: userId,
            items: orderItems,
            shippingAddress,
            billingAddress: getBillingAddress(billingAddress, shippingAddress),
            deliveryMethod,
            subtotal,
            shippingFee,
            tax,
            totalAmount,
            paymentMethod,
            transactionReference,
            checkoutId,
            inventoryStatus:
              paymentMethod === "stripe" ? "reserved" : "committed",
            paymentExpiresAt:
              paymentMethod === "stripe" ? getReservationExpiry() : undefined,
            invoiceNumber: invoiceService.generateInvoiceNumber(orderId),
          },
        ],
        { session },
      );

      for (const item of cart.items) {
        const result = await Product.updateOne(
          { _id: item.product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );

        if (result.modifiedCount === 0) {
          throw new ApiError(
            400,
            `Insufficient stock for ${item.product.name}`,
          );
        }
      }

      // A Stripe cart remains available until the signed success webhook
      // commits the reservation. This also gives failed payments a retry path.
      if (paymentMethod === "cod") {
        cart.items = [];
        await cart.save({ session });
      }

      orderId = order._id;
      wasCreated = true;
    });
  } catch (error) {
    if (error.code === 11000 && checkoutId) {
      const duplicate = await findIdempotentOrder(userId, checkoutId);
      if (duplicate) return duplicate;
    }
    throw error;
  } finally {
    await session.endSession();
  }

  const createdOrder = await populateOrder(Order.findById(orderId));
  if (!createdOrder) {
    throw new ApiError(500, "Order was created but could not be loaded");
  }

  if (!wasCreated) return createdOrder;

  await invalidateCacheGroups(["products", "analytics"]);

  // Stripe invoices/admin notifications are sent only after a verified paid
  // webhook. COD orders are committed immediately.
  if (createdOrder.paymentMethod === "cod") {
    await runCodOrderSideEffects(createdOrder);
  }

  return createdOrder;
};

const getMyOrders = async (userId) =>
  await Order.find({ user: userId })
    .populate(
      "items.product",
      "name slug images description sku stock price discountPrice",
    )
    .sort({ createdAt: -1 });

const getSingleOrder = async (orderId, userId, role) => {
  const order = await populateOrder(Order.findById(orderId));
  if (!order) throw new ApiError(404, "Order not found");

  if (role !== "admin" && order.user._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to view this order");
  }
  return order;
};

const getAllOrders = async (query) => {
  const page = Math.max(1, Math.trunc(Number(query.page) || 1));
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;
  const totalOrders = await Order.countDocuments();
  const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

  const orders = await populateOrder(Order.find())
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    orders,
    pagination: {
      totalOrders,
      currentPage: page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const updateOrderStatus = async (orderId, orderStatus, requestedBy) => {
  const { userId, role } = requestedBy;
  const session = await mongoose.startSession();
  let updatedOrderId;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new ApiError(404, "Order not found");

      if (role !== "admin") {
        if (order.user.toString() !== userId.toString()) {
          throw new ApiError(403, "You are not authorized to modify this order");
        }
        if (orderStatus !== "cancelled") {
          throw new ApiError(403, "You can only cancel your order");
        }
      }

      if (order.orderStatus === orderStatus) {
        throw new ApiError(400, `Order is already ${orderStatus}`);
      }

      if (
        order.paymentMethod === "stripe" &&
        order.paymentStatus !== "paid" &&
        orderStatus !== "cancelled"
      ) {
        throw new ApiError(
          400,
          "A Stripe order cannot advance until its payment is verified",
        );
      }

      const allowedTransitions = {
        pending: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      if (!allowedTransitions[order.orderStatus]?.includes(orderStatus)) {
        throw new ApiError(
          400,
          `Cannot change order from ${order.orderStatus} to ${orderStatus}`,
        );
      }

      if (orderStatus === "cancelled") {
        if (order.inventoryStatus !== "released") {
          const stockOperations = order.items.map((item) => ({
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: item.quantity } },
            },
          }));
          if (stockOperations.length > 0) {
            await Product.bulkWrite(stockOperations, { session });
          }
          order.inventoryStatus = "released";
        }

        if (
          order.paymentMethod === "stripe" &&
          order.paymentStatus === "paid" &&
          order.paymentIntentId
        ) {
          order.refundStatus = "pending";
          order.refundRequestedAt = new Date();
          await enqueueRefund(order, session);
        } else if (order.paymentMethod === "stripe") {
          order.paymentStatus = "failed";
          order.lastPaymentError = "Order cancelled before payment completed";
          await enqueuePaymentIntentCancellation(order, session);
        }
      }

      order.orderStatus = orderStatus;
      if (order.paymentMethod === "cod" && orderStatus === "delivered") {
        order.paymentStatus = "paid";
      }

      await order.save({ session });
      updatedOrderId = order._id;
    });
  } finally {
    await session.endSession();
  }

  await invalidateCacheGroups(["products", "analytics"]);
  const updatedOrder = await populateOrder(Order.findById(updatedOrderId));

  // The status change is already committed to the database at this point, so
  // the admin/customer facing response should return immediately. The email
  // notification is sent in the background (fire-and-forget) instead of being
  // awaited here — previously this could add 10-20s to the request because
  // the API response waited on the email provider before responding.
  if (updatedOrder?.user?.email) {
    emailNotificationService
      .sendOrderStatusUpdateEmail(updatedOrder, orderStatus)
      .catch((error) => {
        console.error(
          `Failed to send order status update email for order ${updatedOrder._id}:`,
          error,
        );
      });
  }

  return updatedOrder;
};

module.exports = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
};
