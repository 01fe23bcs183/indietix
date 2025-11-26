/**
 * Simple deterministic hash function for bucketing users into variants.
 * Uses a simple string hash algorithm that produces consistent results.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Determines if a user should be included in a rollout based on percentage.
 * Uses deterministic hashing so the same user always gets the same result.
 */
export function isInRollout(
  userId: string,
  flagKey: string,
  rolloutPercentage: number
): boolean {
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;

  const hash = hashString(`${userId}:${flagKey}`);
  const bucket = hash % 100;
  return bucket < rolloutPercentage;
}

/**
 * Assigns a user to a variant based on weighted distribution.
 * Uses deterministic hashing so the same user always gets the same variant.
 */
export function assignToBucket(
  userId: string,
  experimentKey: string,
  variants: Array<{ name: string; weight: number }>
): string {
  if (variants.length === 0) {
    throw new Error("No variants provided");
  }

  if (variants.length === 1) {
    const firstVariant = variants[0];
    if (!firstVariant) {
      throw new Error("No variants provided");
    }
    return firstVariant.name;
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Total weight must be positive");
  }

  const hash = hashString(`${userId}:${experimentKey}`);
  const bucket = hash % totalWeight;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.name;
    }
  }

  // Fallback to last variant (should not reach here)
  const lastVariant = variants[variants.length - 1];
  if (!lastVariant) {
    throw new Error("No variants provided");
  }
  return lastVariant.name;
}
