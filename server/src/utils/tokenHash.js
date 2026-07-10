const crypto = require("crypto");

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const getTokenStorageCandidates = (token) => [token, hashToken(token)];

module.exports = { getTokenStorageCandidates, hashToken };
