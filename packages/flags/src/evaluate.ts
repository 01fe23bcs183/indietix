import type { UserContext, TargetingRules } from "./types";
import { isInRollout } from "./hash";

/**
 * Evaluates targeting rules against a user context.
 * Returns true if the user matches the targeting rules.
 */
export function evaluateRules(
  userCtx: UserContext,
  rules: TargetingRules | null
): boolean {
  if (!rules) {
    return true; // No rules means everyone is targeted
  }

  // Check deny list first (highest priority)
  if (rules.denyList && rules.denyList.length > 0) {
    if (userCtx.userId && rules.denyList.includes(userCtx.userId)) {
      return false;
    }
  }

  // Check allow list (if user is in allow list, they pass regardless of other rules)
  if (rules.allowList && rules.allowList.length > 0) {
    if (userCtx.userId && rules.allowList.includes(userCtx.userId)) {
      return true;
    }
  }

  // Check role targeting
  if (rules.roles && rules.roles.length > 0) {
    if (!userCtx.role || !rules.roles.includes(userCtx.role)) {
      return false;
    }
  }

  // Check city targeting
  if (rules.cities && rules.cities.length > 0) {
    if (!userCtx.city || !rules.cities.includes(userCtx.city)) {
      return false;
    }
  }

  // Check category targeting
  if (rules.categories && rules.categories.length > 0) {
    if (!userCtx.category || !rules.categories.includes(userCtx.category)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates a feature flag for a given user context.
 * Returns true if the flag is active for the user.
 */
export function evaluateFlag(
  userCtx: UserContext,
  flag: {
    key: string;
    enabled: boolean;
    rollout: number;
    rules: TargetingRules | null;
  }
): boolean {
  // Check if flag is globally enabled
  if (!flag.enabled) {
    return false;
  }

  // Check targeting rules
  if (!evaluateRules(userCtx, flag.rules)) {
    return false;
  }

  // Check rollout percentage (only if user has an ID)
  if (userCtx.userId) {
    if (!isInRollout(userCtx.userId, flag.key, flag.rollout)) {
      return false;
    }
  } else if (flag.rollout < 100) {
    // Anonymous users only get the flag if rollout is 100%
    return false;
  }

  return true;
}
