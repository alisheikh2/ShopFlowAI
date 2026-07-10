require("../test-support/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Category = require("../src/models/category.model");
const Product = require("../src/models/product.model");
const Wishlist = require("../src/models/wishlist.model");
const OutboxEvent = require("../src/models/outboxEvent.model");
const categoryService = require("../src/services/category.service");
const productService = require("../src/services/product.service");
const cartService = require("../src/services/cart.service");
const wishlistService = require("../src/services/wishlist.service");

let replset;
let user;
let activeCategory;

test.before(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri("catalog_integrity_integration"));
  user = await User.create({
    name: "Catalog Test",
    email: "catalog@example.com",
    password: "Strong!Pass123",
    isEmailVerified: true,
  });
  activeCategory = await categoryService.createCategory(
    { name: "Active Catalog", isActive: true },
    user._id,
  );
});

test.after(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

test("public categories hide inactive records while admin listing includes them", async () => {
  await categoryService.createCategory(
    { name: "Hidden Catalog", isActive: false },
    user._id,
  );
  const publicResult = await categoryService.getAllCategories({ limit: 100 });
  assert.equal(publicResult.categories.some((item) => item.name === "Hidden Catalog"), false);

  const adminResult = await categoryService.getAllCategories(
    { limit: 100 },
    { includeInactive: true },
  );
  assert.equal(adminResult.categories.some((item) => item.name === "Hidden Catalog"), true);
  await assert.rejects(
    categoryService.getCategoryBySlug("hidden-catalog"),
    /Category not found/,
  );
  assert.equal(
    (await categoryService.getCategoryBySlug(
      "hidden-catalog",
      { includeInactive: true },
    )).name,
    "Hidden Catalog",
  );
});

test("product free-text search covers name, SKU and brand", async () => {
  await Product.create({
    name: "Searchable Device",
    slug: "searchable-device",
    sku: "UNIQUE-SKU-7788",
    brand: "DistinctiveBrand",
    description: "A valid product used to test catalog search behavior.",
    price: 1000,
    stock: 5,
    category: activeCategory._id,
    createdBy: user._id,
  });

  assert.equal((await productService.getAllProducts({ search: "Searchable", limit: 10 })).products.length, 1);
  assert.equal((await productService.getAllProducts({ search: "SKU-7788", limit: 10 })).products.length, 1);
  assert.equal((await productService.getAllProducts({ search: "distinctivebrand", limit: 10 })).products.length, 1);
});

test("cart refreshes stale prices and reports the price change", async () => {
  let product = await Product.findOne({ slug: "searchable-device" });
  product = await productService.updateProduct(product.slug, { price: 1100 });
  assert.equal(product.price, 1100);
  await cartService.addToCart(user._id, product._id.toString(), 1);
  await Product.findByIdAndUpdate(product._id, { price: 1400 });

  const cart = await cartService.getCart(user._id);
  assert.equal(cart.subtotal, 1400);
  assert.equal(cart.pricingUpdated, true);
  assert.equal(cart.items[0].priceChanged, true);
  assert.equal(cart.items[0].previousPrice, 1100);
});

test("unpublished wishlist entries are rejected/cleaned", async () => {
  const product = await Product.findOne({ slug: "searchable-device" });
  await wishlistService.addToWishlist(user._id, product._id);
  await Product.findByIdAndUpdate(product._id, { isPublished: false });

  const wishlist = await wishlistService.getUserWishlist(user._id);
  assert.equal(wishlist.length, 0);
  assert.equal(await Wishlist.countDocuments({ user: user._id, product: product._id }), 0);
  await assert.rejects(
    wishlistService.addToWishlist(user._id, product._id),
    /Product not found/,
  );
});

test("product deletion is transactional and queues Cloudinary cleanup", async () => {
  const product = await Product.create({
    name: "Delete With Image",
    slug: "delete-with-image",
    description: "A valid product used to test deferred image cleanup.",
    price: 500,
    stock: 1,
    category: activeCategory._id,
    createdBy: user._id,
    images: [{ public_id: "shopflow/test/delete-image", url: "https://example.com/image.jpg" }],
  });

  await productService.deleteProduct(product.slug);
  assert.equal(await Product.countDocuments({ _id: product._id }), 0);
  const event = await OutboxEvent.findOne({
    type: "cloudinary.images.delete",
    aggregateId: product._id,
  });
  assert.deepEqual(event.payload.publicIds, ["shopflow/test/delete-image"]);
});
