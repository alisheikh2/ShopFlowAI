const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    nameSnapshot: {
      type: String,
      required: true,
    },

    skuSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    imageSnapshot: {
      type: String,
      default: "",
    },

    // Category name captured at the time of purchase so revenue can still be
    // attributed correctly in analytics even if the product/category is later
    // edited or deleted (this used to fall back to "Uncategorized").
    categorySnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    taxSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
      lowercase: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [orderItemSchema],

    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      postalCode: {
        type: String,
        required: true,
        trim: true,
      },

      country: {
        type: String,
        required: true,
        trim: true,
      },
    },

    billingAddress: {
      type: addressSchema,
      default: undefined,
    },

    deliveryMethod: {
      type: String,
      trim: true,
      default: "Standard Delivery",
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "stripe"],
      default: "cod",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paymentIntentId: {
      type: String,
      default: "",
      index: true,
    },

    // A client-generated key makes order creation safe to retry after a
    // network error/double-click without reserving inventory twice.
    checkoutId: {
      type: String,
      trim: true,
      default: undefined,
    },

    // Stripe inventory is reserved for a bounded window. COD inventory is
    // committed immediately; released means stock has already been restored.
    inventoryStatus: {
      type: String,
      enum: ["reserved", "committed", "released"],
      default: "committed",
    },

    paymentExpiresAt: {
      type: Date,
      default: undefined,
    },

    // Immutable charge quote used to validate signed Stripe webhooks.
    paymentAmountMinor: {
      type: Number,
      min: 1,
      default: undefined,
    },

    paymentCurrency: {
      type: String,
      lowercase: true,
      trim: true,
      default: "usd",
    },

    paymentExchangeRate: {
      type: Number,
      min: 0,
      default: undefined,
    },

    paymentAttempt: {
      type: Number,
      min: 1,
      default: 1,
    },

    lastPaymentError: {
      type: String,
      default: "",
      maxlength: 500,
    },

    refundStatus: {
      type: String,
      enum: ["none", "pending", "processing", "succeeded", "failed"],
      default: "none",
    },

    refundId: {
      type: String,
      default: "",
    },

    refundRequestedAt: Date,
    refundFailureReason: {
      type: String,
      default: "",
      maxlength: 500,
    },

    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    invoiceEmailSentAt: {
      type: Date,
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
orderSchema.index({ user: 1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "items.product": 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "shippingAddress.city": 1 });
orderSchema.index({ paymentExpiresAt: 1, inventoryStatus: 1 });
orderSchema.index(
  { user: 1, checkoutId: 1 },
  {
    unique: true,
    partialFilterExpression: { checkoutId: { $type: "string" } },
  },
);

module.exports = mongoose.model("Order", orderSchema);
