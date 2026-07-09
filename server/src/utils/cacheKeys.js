const stableQueryString = (query = {}) => {
  const keys = Object.keys(query).sort();

  if (keys.length === 0) {
    return "all";
  }

  return keys
    .map((key) => {
      const value = query[key];
      const normalizedValue = Array.isArray(value)
        ? value.map(String).sort().join(",")
        : String(value);

      return `${encodeURIComponent(key)}=${encodeURIComponent(normalizedValue)}`;
    })
    .join("&");
};

const buildProductsListKey = (req) =>
  `cache:products:list:${stableQueryString(req.query)}`;

const buildProductDetailKey = (req) =>
  `cache:product:slug:${String(req.params.slug || "").toLowerCase()}`;

const buildCategoriesListKey = (req) =>
  `cache:categories:list:${stableQueryString(req.query)}`;

const buildCategoryDetailKey = (req) =>
  `cache:category:slug:${String(req.params.slug || "").toLowerCase()}`;

const buildAnalyticsKey = (name) => (req) =>
  `cache:analytics:${name}:${stableQueryString(req.query)}`;

module.exports = {
  buildAnalyticsKey,
  buildCategoriesListKey,
  buildCategoryDetailKey,
  buildProductDetailKey,
  buildProductsListKey,
  stableQueryString,
};
