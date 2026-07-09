const { getRedisClient, isCacheEnabled } = require("../config/redis");

const getCacheTTL = (value, fallback) => {
  const ttl = Number(value);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : fallback;
};

const cacheResponse = (ttlSeconds, keyBuilder) => async (req, res, next) => {
  if (!isCacheEnabled() || req.method !== "GET") {
    return next();
  }

  const redis = getRedisClient();
  if (!redis) {
    return next();
  }

  const cacheKey = keyBuilder(req);

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      res.setHeader("X-Cache", "HIT");
      return res.status(parsed.statusCode || 200).json(parsed.body);
    }
  } catch (error) {
    console.error(`Cache read failed for ${cacheKey}:`, error.message);
  }

  res.setHeader("X-Cache", "MISS");

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 200 && statusCode < 300) {
      redis
        .set(
          cacheKey,
          JSON.stringify({
            statusCode,
            body,
          }),
          "EX",
          ttlSeconds,
        )
        .catch((error) => {
          console.error(`Cache write failed for ${cacheKey}:`, error.message);
        });
    }

    return originalJson(body);
  };

  return next();
};

module.exports = {
  cacheResponse,
  getCacheTTL,
};
