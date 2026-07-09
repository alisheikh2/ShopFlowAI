const Redis = require("ioredis");

let redisClient;
let hasLoggedConnectionError = false;

const isCacheEnabled = () => process.env.CACHE_ENABLED === "true";

const getRedisClient = () => {
  if (!isCacheEnabled()) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 50, 1000),
    });

    redisClient.on("connect", () => {
      hasLoggedConnectionError = false;
      if (process.env.NODE_ENV !== "test") {
        console.log("✅ Redis connected");
      }
    });

    redisClient.on("error", (error) => {
      if (!hasLoggedConnectionError) {
        console.error("Redis connection error:", error.message);
        hasLoggedConnectionError = true;
      }
    });
  }

  return redisClient;
};

const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = undefined;
  }
};

module.exports = {
  closeRedisConnection,
  getRedisClient,
  isCacheEnabled,
};
