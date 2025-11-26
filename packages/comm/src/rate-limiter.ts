import { DEFAULT_RATE_LIMITS, type RateLimitConfig } from "./types";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  ratePerSecond: number;
}

const buckets: Map<string, TokenBucket> = new Map();

export function getRateLimitForChannel(
  channel: "EMAIL" | "SMS" | "PUSH",
  override?: number
): number {
  if (override !== undefined && override > 0) {
    return override;
  }
  const key = channel.toLowerCase() as keyof RateLimitConfig;
  return DEFAULT_RATE_LIMITS[key];
}

export function initializeBucket(
  channel: "EMAIL" | "SMS" | "PUSH",
  ratePerSecond: number
): void {
  const key = `bucket:${channel}`;
  buckets.set(key, {
    tokens: ratePerSecond,
    lastRefill: Date.now(),
    ratePerSecond,
  });
}

export function tryConsumeToken(channel: "EMAIL" | "SMS" | "PUSH"): boolean {
  const key = `bucket:${channel}`;
  let bucket = buckets.get(key);

  if (!bucket) {
    const rate = getRateLimitForChannel(channel);
    bucket = {
      tokens: rate,
      lastRefill: Date.now(),
      ratePerSecond: rate,
    };
    buckets.set(key, bucket);
  }

  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = Math.floor(elapsed * bucket.ratePerSecond);

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      bucket.ratePerSecond,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }

  return false;
}

export function getAvailableTokens(channel: "EMAIL" | "SMS" | "PUSH"): number {
  const key = `bucket:${channel}`;
  const bucket = buckets.get(key);
  return bucket?.tokens ?? getRateLimitForChannel(channel);
}

export function resetBucket(channel: "EMAIL" | "SMS" | "PUSH"): void {
  const key = `bucket:${channel}`;
  buckets.delete(key);
}

export function resetAllBuckets(): void {
  buckets.clear();
}

export async function waitForToken(
  channel: "EMAIL" | "SMS" | "PUSH",
  maxWaitMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (tryConsumeToken(channel)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

export function calculateBatchSize(
  channel: "EMAIL" | "SMS" | "PUSH",
  totalRecipients: number,
  override?: number
): number {
  const ratePerSecond = getRateLimitForChannel(channel, override);
  return Math.min(totalRecipients, ratePerSecond);
}
