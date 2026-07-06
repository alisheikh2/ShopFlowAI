const express = require("express");

const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const categoryRoutes = require("./category.routes");
const cartRoutes = require("./cart.routes");
const reviewRoutes = require("./review.routes");
const orderRoutes = require("./order.routes");
const wishlistRoutes = require("./wishlist.routes");
const aiRoutes = require("./ai.routes");
const paymentRoutes = require("./payment.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/reviews", reviewRoutes);
router.use("/orders", orderRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/ai", aiRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;