const stripe = require("../config/stripe");
const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");
const { getSafeLimit } = require("../utils/queryHelpers");
const invoiceConfig = require("../config/invoice");
const emailNotificationService = require("./emailNotification.service");
const invoiceService = require("./invoice.service");

const roundMoney = (amount) => Math.round(Number(amount || 0) * 100) / 100;

const getProductSku = (product) => {
  if (product.sku) return product.sku;
  return `SKU-${product._id.toString().slice(-8).toUpperCase()}`;
};

const getBillingAddress = (billingAddress, shippingAddress) => {
  if (!billingAddress) return shippingAddress;

  return {
    ...shippingAddress,
    ...billingAddress,
  };
};

const createOrder = async (userId, data) => {
  const session = await mongoose.startSession();
  let transactionCommitted = false;

  try {
    session.startTransaction();

    const {
      shippingAddress,
      billingAddress,
      paymentMethod = "cod",
      deliveryMethod = invoiceConfig.defaultDeliveryMethod,
      transactionReference = "",
    } = data;

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
      const product = await Product.findById(item.product._id).session(session);

      if (!product) {
        throw new ApiError(404, `Product "${item.product.name}" not found`);
      }

      if (!product.isPublished) {
        throw new ApiError(400, `${product.name} is unavailable`);
      }

      const price =
        product.discountPrice > 0 ? product.discountPrice : product.price;

      const lineSubtotal = roundMoney(price * item.quantity);
      const lineTax = roundMoney((lineSubtotal * invoiceConfig.taxRate) / 100);

      subtotal += lineSubtotal;
      totalTax += lineTax;

      orderItems.push({
        product: product._id,
        nameSnapshot: product.name,
        skuSnapshot: getProductSku(product),
        imageSnapshot: product.images.length > 0 ? product.images[0].url : "",
        priceSnapshot: price,
        quantity: item.quantity,
        taxSnapshot: lineTax,
      });
    }

    subtotal = roundMoney(subtotal);
    const shippingFee = 0;
    const tax = roundMoney(totalTax);
    const totalAmount = roundMoney(subtotal + shippingFee + tax);
    const orderId = new mongoose.Types.ObjectId();

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
          invoiceNumber: invoiceService.generateInvoiceNumber(orderId),
        },
      ],
      { session },
    );

    for (const item of cart.items) {
      const result = await Product.updateOne(
        {
          _id: item.product._id,
          stock: { $gte: item.quantity },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        },
        {
          session,
        },
      );

      if (result.modifiedCount === 0) {
        throw new ApiError(
          400,
          `Insufficient stock for ${item.nameSnapshot || item.product.name}`,
        );
      }
    }

    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    transactionCommitted = true;

    const createdOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("items.product", "name slug images description sku stock price discountPrice");

    // Email notifications should not rollback a successfully placed order if SMTP fails.
    if (createdOrder.user?.email) {
      await emailNotificationService.sendOrderConfirmationEmail(createdOrder);
    }

    try {
      if (createdOrder.user?.email) {
        await invoiceService.sendOrderInvoiceEmail(createdOrder);
      }
    } catch (emailError) {
      console.error(
        `Invoice email failed for order ${createdOrder._id}:`,
        emailError.message,
      );
    }

    await emailNotificationService.sendAdminNewOrderEmail(createdOrder);
    await emailNotificationService.sendLowStockAlertsForOrder(createdOrder);

    return createdOrder;
  } catch (error) {
    if (!transactionCommitted) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const getMyOrders = async (userId) => {
  return await Order.find({
    user: userId,
  })
    .populate("items.product", "name slug images description sku stock price discountPrice")
    .sort({ createdAt: -1 });
};

const getSingleOrder = async (orderId, userId, role) => {
  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("items.product", "name slug images description sku stock price discountPrice");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (role !== "admin" && order.user._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to view this order");
  }

  return order;
};

const getAllOrders = async (query) => {
  const page = Number(query.page) || 1;
  const limit = getSafeLimit(query.limit);
  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments();
  const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

  const orders = await Order.find()
    .populate("user", "name email")
    .populate("items.product", "name slug images description sku stock price discountPrice")
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

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // Customers can only cancel their own orders — nothing else
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

    const allowedTransitions = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!allowedTransitions[order.orderStatus].includes(orderStatus)) {
      throw new ApiError(
        400,
        `Cannot change order from ${order.orderStatus} to ${orderStatus}`,
      );
    }

    if (orderStatus === "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity,
            },
          },
          {
            session,
          },
        );
      }
      if (
        order.paymentMethod === "stripe" &&
        order.paymentStatus === "paid" &&
        order.paymentIntentId
      ) {
        try {
          await stripe.refunds.create({
            payment_intent: order.paymentIntentId,
          });
        } catch (refundError) {
          console.error("Stripe refund failed:", refundError.message);
          throw new ApiError(
            500,
            "Failed to process refund. Order not cancelled.",
          );
        }

        order.paymentStatus = "refunded";
      }
    }

    order.orderStatus = orderStatus;

    if (order.paymentMethod === "cod" && orderStatus === "delivered") {
      order.paymentStatus = "paid";
    }

    await order.save({ session });

    await session.commitTransaction();

    const updatedOrderForEmail = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("items.product", "name slug images description sku stock price discountPrice");

    if (updatedOrderForEmail?.user?.email) {
      await emailNotificationService.sendOrderStatusUpdateEmail(
        updatedOrderForEmail,
        orderStatus,
      );
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
};