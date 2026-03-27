import { Redis } from "ioredis";
import { config } from "./config";
import { logger } from "./logger";

let sharedClient: Redis | null = null;
let connectionAttempted = false;

/**
 * Returns a shared ioredis instance, or null if Redis is unavailable.
 * Safe to call multiple times — the same instance is reused.
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (sharedClient) return sharedClient;
  if (connectionAttempted) return null;
  connectionAttempted = true;

  if (!config.redisUrl) {
    logger.info("REDIS_URL not set — Redis features disabled");
    return null;
  }

  try {
    const client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    const noop = () => {};
    client.on("error", noop);
    await client.connect();
    client.removeListener("error", noop);
    // Restore retry for runtime reconnections
    client.options.retryStrategy = (times: number) => Math.min(times * 200, 5000);
    sharedClient = client;
    logger.info("Shared Redis client connected");
    return client;
  } catch (err) {
    logger.warn({ err }, "Redis connection failed — features will use in-memory fallback");
    return null;
  }
}

/**
 * Returns the shared client if already connected (synchronous, no connect attempt).
 * Useful for hot paths that cannot await.
 */
export function getRedisClientSync(): Redis | null {
  return sharedClient;
}

/**
 * Disconnect the shared client (for graceful shutdown).
 */
export async function disconnectRedis(): Promise<void> {
  if (sharedClient) {
    sharedClient.disconnect();
    sharedClient = null;
  }
  connectionAttempted = false;
}
