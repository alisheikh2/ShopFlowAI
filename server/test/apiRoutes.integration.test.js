require("../test-support/testEnv");
process.env.CLIENT_URL = "http://allowed.test";
process.env.PUBLIC_CLIENT_URL = "http://allowed.test";
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "1";
process.env.SMTP_USER = "test";
process.env.SMTP_PASS = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const cloudinary = require("../src/config/cloudinary");
const emailService = require("../src/services/emailNotification.service");
const invoiceService = require("../src/services/invoice.service");

let uploadedImageCounter = 0;
cloudinary.uploader.upload = async () => {
  uploadedImageCounter += 1;
  return {
    public_id: `shopflow/test/api-product-${uploadedImageCounter}`,
    secure_url: `https://example.com/api-product-${uploadedImageCounter}.jpg`,
  };
};
cloudinary.uploader.destroy = async () => ({ result: "ok" });

for (const name of [
  "sendOrderConfirmationEmail",
  "sendAdminNewOrderEmail",
  "sendLowStockAlertsForOrder",
  "sendOrderStatusUpdateEmail",
  "sendPaymentSuccessEmail",
  "sendPaymentFailedEmail",
]) {
  emailService[name] = async () => true;
}
invoiceService.sendOrderInvoiceEmail = async () => true;

let replset;
let server;
let baseUrl;
let adminToken;
let customerToken;
let refreshCookie;

const request = async (
  method,
  path,
  { body, token, cookie, origin = "http://allowed.test", expected = 200 } = {},
) => {
  const isFormData = body instanceof FormData;
  const headers = { Origin: origin };
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json")
    ? await response.json()
    : await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
  return { response, payload };
};

test.before(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri("api_routes_integration"));
  const admin = await User.create({
    name: "API Admin",
    email: "api-admin@example.com",
    password: "Strong!Pass123",
    role: "admin",
    isEmailVerified: true,
  });
  await User.create({
    name: "API Customer",
    email: "api-customer@example.com",
    password: "Strong!Pass123",
    isEmailVerified: true,
  });
  adminToken = admin.generateAccessToken();

  const app = require("../src/app");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const login = await request("POST", "/users/login", {
    body: {
      email: "api-customer@example.com",
      password: "Strong!Pass123",
    },
  });
  customerToken = login.payload.data.accessToken;
  refreshCookie = login.response.headers.get("set-cookie").split(";")[0];
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await replset.stop();
});

test("auth middleware, refresh rotation and controlled CORS rejection work", async () => {
  await request("GET", "/health");
  await request("GET", "/users/me", { expected: 401 });
  const me = await request("GET", "/users/me", { token: customerToken });
  assert.equal(me.payload.data.user.email, "api-customer@example.com");

  const refreshed = await request("POST", "/users/refresh-token", {
    cookie: refreshCookie,
  });
  assert.ok(refreshed.payload.data.accessToken);

  const forgot = await request("POST", "/users/forgot-password", {
    body: { email: "api-customer@example.com" },
  });
  assert.match(forgot.payload.message, /If an account/);

  await request("GET", "/health", {
    origin: "https://blocked.example",
    expected: 403,
  });
});

test("admin/public catalog, search, cart and COD order routes work together", async () => {
  const missingDescription = await request("POST", "/categories", {
    token: adminToken,
    expected: 400,
    body: { name: "Missing Description" },
  });
  assert.match(missingDescription.payload.message, /description is required/i);

  const hidden = await request("POST", "/categories", {
    token: adminToken,
    expected: 201,
    body: {
      name: "API Hidden",
      description: "A hidden category used to verify admin-only catalog visibility.",
      isActive: false,
    },
  });
  const active = await request("POST", "/categories", {
    token: adminToken,
    expected: 201,
    body: {
      name: "API Active",
      description: "An active category used for API product and order testing.",
      isActive: true,
    },
  });

  const publicCategories = await request("GET", "/categories");
  assert.equal(
    publicCategories.payload.data.categories.some(
      (category) => category._id === hidden.payload.data.category._id,
    ),
    false,
  );
  const adminCategories = await request("GET", "/categories/admin/all", {
    token: adminToken,
  });
  assert.equal(adminCategories.payload.data.categories.length, 2);

  const productFields = {
    name: "API Route Product",
    sku: "API-UNIQUE-9911",
    brand: "RouteBrand",
    description: "A valid product created by the API integration test.",
    price: "1200",
    stock: "5",
    category: active.payload.data.category._id,
    isPublished: "true",
  };

  const missingImage = await request("POST", "/products", {
    token: adminToken,
    expected: 400,
    body: productFields,
  });
  assert.match(missingImage.payload.message, /at least one product image/i);

  const productForm = new FormData();
  Object.entries(productFields).forEach(([key, value]) => productForm.append(key, value));
  productForm.append(
    "images",
    new Blob(["shopflow-test-image"], { type: "image/png" }),
    "api-product.png",
  );

  const productResponse = await request("POST", "/products", {
    token: adminToken,
    expected: 201,
    body: productForm,
  });
  const product = productResponse.payload.data.product;
  const bySku = await request("GET", "/products?search=UNIQUE-9911");
  assert.equal(bySku.payload.data.products.length, 1);

  await request("POST", "/cart", {
    token: customerToken,
    expected: 201,
    body: { productId: product._id, quantity: 2 },
  });
  const order = await request("POST", "/orders", {
    token: customerToken,
    expected: 201,
    body: {
      shippingAddress: {
        fullName: "API Customer",
        phone: "+923001234567",
        address: "Test Street",
        city: "Okara",
        postalCode: "56300",
        country: "Pakistan",
      },
      paymentMethod: "cod",
      checkoutId: crypto.randomUUID(),
    },
  });
  assert.equal(order.payload.data.order.inventoryStatus, "committed");
  const cart = await request("GET", "/cart", { token: customerToken });
  assert.equal(cart.payload.data.cart.totalItems, 0);
});
