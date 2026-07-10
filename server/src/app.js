const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

const routes = require("./routes");
const ApiError = require("./utils/apiError");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security headers
app.use(helmet());

// Logging 
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (Postman, curl, server-to-server) with no origin
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, "Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize against NoSQL injection 
app.use(mongoSanitize());

// Prevent HTTP param pollution 
app.use(hpp());

// API Routes
app.use("/api/v1", routes);

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;