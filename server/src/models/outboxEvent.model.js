const mongoose = require("mongoose");

const outboxEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "stripe.refund.requested",
        "stripe.payment_intent.cancel.requested",
        "cloudinary.images.delete",
      ],
      index: true,
    },
    aggregateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: Date,
    completedAt: Date,
    lastError: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, availableAt: 1 });

module.exports = mongoose.model("OutboxEvent", outboxEventSchema);
