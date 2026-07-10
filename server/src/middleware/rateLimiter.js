const rateLimit = require("express-rate-limit");

// Strict limiter for auth endpoints prone to brute-force / credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: {
    success: false,
    statusCode: 429,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slightly looser limiter for forgot-password (people fat-finger emails)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many password reset requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation is expensive (Gemini quota) — cap per-user/IP usage
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    statusCode: 429,
    message: "AI generation limit reached. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// These run after verifyJWT, so account ID is a stable key and one user cannot
// reserve the entire catalog or create excessive Stripe attempts.
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `user:${req.user._id}`,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many order attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `user:${req.user._id}`,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many payment attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  aiLimiter,
  authLimiter,
  forgotPasswordLimiter,
  orderLimiter,
  paymentLimiter,
};