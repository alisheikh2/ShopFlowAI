const crypto = require("crypto");

const DEFAULT_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

const generateSecureToken = (expiryMs = DEFAULT_EXPIRY_MS) => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiry = new Date(Date.now() + expiryMs);

  return {
    rawToken,
    hashedToken,
    expiry,
  };
};

module.exports = generateSecureToken;