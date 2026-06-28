const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const ApiError = require("./utils/apiError");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/v1", routes);

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;