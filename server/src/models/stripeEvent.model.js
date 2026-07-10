const mongoose = require("mongoose");

const stripeEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    paymentIntentId: {
      type: String,
      default: "",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: undefined,
    },
    outcome: {
      type: String,
      enum: ["processed", "ignored", "rejected"],
      required: true,
    },
    reason: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StripeEvent", stripeEventSchema);
