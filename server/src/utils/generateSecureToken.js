const crypto = require("crypto");

const generateSecureToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  return {
    rawToken,
    hashedToken,
    expiry,
  };
};

module.exports = generateSecureToken;