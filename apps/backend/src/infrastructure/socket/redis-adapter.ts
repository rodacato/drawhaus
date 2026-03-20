import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { Server } from "socket.io";
import { config } from "../config";
import { logger } from "../logger";

// Suppress ioredis "unhandled error" logs during connection attempt
const noop = () => {};

export async function attachRedisAdapter(io: Server): Promise<void> {
  if (!config.redisUrl) {
    logger.info("REDIS_URL not set — using in-memory Socket.IO adapter");
    return;
  }

  let pubClient: Redis | undefined;
  let subClient: Redis | undefined;

  try {
    pubClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    subClient = pubClient.duplicate();

    // Absorb errors during connect so ioredis doesn't log "Unhandled error event"
    pubClient.on("error", noop);
    subClient.on("error", noop);

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
    ]);

    // Remove noop handlers — let runtime errors surface normally
    pubClient.removeListener("error", noop);
    subClient.removeListener("error", noop);

    // Restore retry for runtime reconnections
    pubClient.options.retryStrategy = (times: number) => Math.min(times * 200, 5000);
    subClient.options.retryStrategy = (times: number) => Math.min(times * 200, 5000);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO Redis adapter attached");
  } catch (err) {
    logger.warn({ err }, "Redis connection failed — falling back to in-memory adapter");
    pubClient?.disconnect();
    subClient?.disconnect();
  }
}
