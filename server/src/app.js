const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const ApiError = require("./utils/apiError");
const errorHandler = require("./middleware/errorHandler");
const paymentRoutes = require("./routes/payment.routes");

const app = express();

app.use(cors());

app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use("/api/v1", routes);

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;