/**
 * config/redis.js
 * Redis client — session store, query cache (TTL: 5 min), Bull.js queue
 */

const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis max reconnect attempts reached');
        return new Error('Redis reconnect failed');
      }
      return Math.min(retries * 100, 3000); // Exponential backoff
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect',    () => console.log('✅ Redis connected'));
redisClient.on('error',      (err) => console.error('❌ Redis error:', err.message));
redisClient.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

// Connect immediately
redisClient.connect().catch(console.error);

// Helper: cache-aside pattern
const cacheGet = async (key) => {
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const cacheSet = async (key, data, ttlSeconds = 300) => {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.error('Redis cacheSet error:', err.message);
  }
};

const cacheDel = async (key) => {
  try { await redisClient.del(key); } catch {}
};

const cacheDelPattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);
  } catch {}
};

module.exports = { redisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
