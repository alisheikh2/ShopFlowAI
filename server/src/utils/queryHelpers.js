// Escapes regex metacharacters so user search input can't break out of
// the intended pattern or cause catastrophic backtracking (ReDoS).
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Caps a requested page-size so ?limit=999999 can't dump the whole collection.
const MAX_LIMIT = 100;
const getSafeLimit = (requestedLimit) => {
  const parsed = Number(requestedLimit) || 10;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

module.exports = { escapeRegex, getSafeLimit };