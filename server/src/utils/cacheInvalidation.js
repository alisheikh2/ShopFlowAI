const { getRedisClient, isCacheEnabled } = require("../config/redis");

const CACHE_GROUP_PATTERNS = {
  products: ["cache:products:*", "cache:product:*"],
  categories: ["cache:categories:*", "cache:category:*"],
  analytics: ["cache:analytics:*"],
};

const deleteByPattern = async (pattern) => {
  if (!isCacheEnabled()) {
    return 0;
  }

  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }

  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
};

const invalidateByPattern = async (pattern) => {
  try {
    return await deleteByPattern(pattern);
  } catch (error) {
    console.error(`Cache invalidation failed for ${pattern}:`, error.message);
    return 0;
  }
};

const invalidateCacheGroups = async (groups = []) => {
  const patterns = groups.flatMap((group) => CACHE_GROUP_PATTERNS[group] || []);
  const uniquePatterns = [...new Set(patterns)];

  await Promise.all(uniquePatterns.map((pattern) => invalidateByPattern(pattern)));
};

module.exports = {
  invalidateByPattern,
  invalidateCacheGroups,
};
