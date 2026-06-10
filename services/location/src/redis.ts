import { Redis } from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
);

export const sub = redis.duplicate();

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (e) => console.error("Redis error: ", e.message));
