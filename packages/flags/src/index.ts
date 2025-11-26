import { prisma } from "@indietix/db";
import type {
  UserContext,
  TargetingRules,
  Variant,
  AssignmentResult,
} from "./types";
import { evaluateFlag } from "./evaluate";
import { assignToBucket } from "./hash";

export type { UserContext, TargetingRules, Variant, AssignmentResult };
export { evaluateFlag, evaluateRules } from "./evaluate";
export { hashString, isInRollout, assignToBucket } from "./hash";

/**
 * Gets the evaluated value of a feature flag for a given user context.
 * Server-side evaluation with database lookup.
 */
export async function getFlag(
  userCtx: UserContext,
  key: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
  });

  if (!flag) {
    return false;
  }

  return evaluateFlag(userCtx, {
    key: flag.key,
    enabled: flag.enabled,
    rollout: flag.rollout,
    rules: flag.rules as TargetingRules | null,
  });
}

/**
 * Gets all evaluated flags for a given user context.
 * Useful for boot-time flag fetching.
 */
export async function getAllFlags(
  userCtx: UserContext
): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany();

  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    result[flag.key] = evaluateFlag(userCtx, {
      key: flag.key,
      enabled: flag.enabled,
      rollout: flag.rollout,
      rules: flag.rules as TargetingRules | null,
    });
  }

  return result;
}

/**
 * Gets the variant for an experiment without creating an assignment.
 * Returns null if the experiment doesn't exist or isn't running.
 */
export async function getVariant(
  userCtx: UserContext,
  experimentKey: string
): Promise<string | null> {
  if (!userCtx.userId) {
    return null;
  }

  // Check for existing assignment
  const existingAssignment = await prisma.experimentAssignment.findUnique({
    where: {
      experimentKey_userId: {
        experimentKey,
        userId: userCtx.userId,
      },
    },
  });

  if (existingAssignment) {
    return existingAssignment.variant;
  }

  // Get experiment to check if it's running
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
  });

  if (!experiment || experiment.status !== "RUNNING") {
    return null;
  }

  // Calculate variant without persisting
  const variants = experiment.variants as unknown as Variant[];
  return assignToBucket(userCtx.userId, experimentKey, variants);
}

/**
 * Assigns a user to a variant in an experiment.
 * Creates a sticky assignment that persists across sessions.
 * Also logs an exposure event.
 */
export async function assignVariant(
  userCtx: UserContext,
  experimentKey: string
): Promise<AssignmentResult | null> {
  if (!userCtx.userId) {
    return null;
  }

  // Check for existing assignment (sticky)
  const existingAssignment = await prisma.experimentAssignment.findUnique({
    where: {
      experimentKey_userId: {
        experimentKey,
        userId: userCtx.userId,
      },
    },
  });

  if (existingAssignment) {
    // Log exposure event
    await prisma.experimentExposure.create({
      data: {
        experimentKey,
        userId: userCtx.userId,
        variant: existingAssignment.variant,
      },
    });

    return {
      variant: existingAssignment.variant,
      isNew: false,
    };
  }

  // Get experiment
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
  });

  if (!experiment || experiment.status !== "RUNNING") {
    return null;
  }

  // Assign to variant based on hash
  const variants = experiment.variants as unknown as Variant[];
  const variant = assignToBucket(userCtx.userId, experimentKey, variants);

  // Create assignment
  await prisma.experimentAssignment.create({
    data: {
      experimentKey,
      userId: userCtx.userId,
      variant,
    },
  });

  // Log exposure event
  await prisma.experimentExposure.create({
    data: {
      experimentKey,
      userId: userCtx.userId,
      variant,
    },
  });

  return {
    variant,
    isNew: true,
  };
}

/**
 * Logs an exposure event for an experiment.
 * Used when a user sees a variant but assignment was already done.
 */
export async function logExposure(
  userCtx: UserContext,
  experimentKey: string,
  variant: string
): Promise<void> {
  if (!userCtx.userId) {
    return;
  }

  await prisma.experimentExposure.create({
    data: {
      experimentKey,
      userId: userCtx.userId,
      variant,
    },
  });
}
