import { NextFunction, Request, Response } from 'express';

// Redis is optional — if REDIS_URL is not set the cache middleware is a no-op.
let redis: import('ioredis').Redis | null = null;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,   // don't retry on failure
    maxRetriesPerRequest: 0,
  });
  redis!.on('error', (err: Error) => {
    console.warn('[Redis] cache unavailable:', err.message);
  });
}

/**
 * Response cache middleware.
 * @param ttlSeconds  How long to cache the response (ignored when Redis is absent).
 */
export function cache(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redis) return next();   // Redis not configured — skip

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch {
      // Redis unavailable — fall through
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      redis!.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      return originalJson(body);
    };

    res.setHeader('X-Cache', 'MISS');
    next();
  };
}

export async function invalidateCache(pattern: string) {
  if (!redis) return;
  const keys = await redis.keys(`cache:${pattern}*`);
  if (keys.length) await redis.del(...keys);
}
