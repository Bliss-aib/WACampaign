import { Redis } from "ioredis";

let _redis: Redis | null = null;

/**
 * Lazy, shared ioredis client for the BullMQ queue and worker.
 *
 * Production: point REDIS_URL at a managed Redis (e.g. Upstash). Use the
 * `rediss://` (TLS) URL — ioredis auto-enables TLS for that scheme. `family: 0`
 * makes ioredis resolve both IPv4 and IPv6, which is required on hosts that use
 * IPv6-only internal networking (Railway, Fly.io). BullMQ requires
 * `maxRetriesPerRequest: null`.
 */
export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error(
        "REDIS_URL is not set — the campaign queue (web) and worker both need it."
      );
    }
    _redis = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      family: 0,
    });
    _redis.on("error", (e) => {
      console.error("[redis] connection error:", e?.message || e);
    });
  }
  return _redis;
}
