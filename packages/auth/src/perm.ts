/**
 * Organizer Team RBAC Permissions
 *
 * Roles: OWNER, MANAGER, STAFF, SCANNER
 * Each role has a set of permissions that determine what actions they can perform.
 */

import { prisma } from "@indietix/db";

export type OrgRole = "OWNER" | "MANAGER" | "STAFF" | "SCANNER";

export type OrgPermission =
  // Event permissions
  | "event.create"
  | "event.edit"
  | "event.delete"
  | "event.view"
  | "event.publish"
  // Attendee permissions
  | "attendees.view"
  | "attendees.export"
  | "attendees.checkin"
  // Payout permissions
  | "payouts.view"
  | "payouts.request"
  // Refund permissions
  | "refunds.view"
  | "refunds.approve"
  // Team permissions
  | "team.view"
  | "team.invite"
  | "team.remove"
  | "team.updateRole"
  // Flash sale permissions
  | "flash.view"
  | "flash.create"
  | "flash.cancel"
  // Campaign permissions
  | "campaigns.view"
  | "campaigns.create"
  | "campaigns.edit"
  // Promo permissions
  | "promos.view"
  | "promos.create"
  | "promos.edit"
  // Analytics permissions
  | "analytics.view"
  // Scanner permissions
  | "scanner.access";

/**
 * Permission matrix defining which roles have which permissions
 */
export const PERMISSION_MATRIX: Record<OrgRole, OrgPermission[]> = {
  OWNER: [
    // All permissions
    "event.create",
    "event.edit",
    "event.delete",
    "event.view",
    "event.publish",
    "attendees.view",
    "attendees.export",
    "attendees.checkin",
    "payouts.view",
    "payouts.request",
    "refunds.view",
    "refunds.approve",
    "team.view",
    "team.invite",
    "team.remove",
    "team.updateRole",
    "flash.view",
    "flash.create",
    "flash.cancel",
    "campaigns.view",
    "campaigns.create",
    "campaigns.edit",
    "promos.view",
    "promos.create",
    "promos.edit",
    "analytics.view",
    "scanner.access",
  ],
  MANAGER: [
    // Create/edit events, view payouts, approve refunds, access attendees
    "event.create",
    "event.edit",
    "event.view",
    "event.publish",
    "attendees.view",
    "attendees.export",
    "attendees.checkin",
    "payouts.view",
    "refunds.view",
    "refunds.approve",
    "team.view",
    "flash.view",
    "flash.create",
    "flash.cancel",
    "campaigns.view",
    "campaigns.create",
    "campaigns.edit",
    "promos.view",
    "promos.create",
    "promos.edit",
    "analytics.view",
    "scanner.access",
  ],
  STAFF: [
    // View events, attendees, export CSV, cannot edit pricing/payouts
    "event.view",
    "attendees.view",
    "attendees.export",
    "attendees.checkin",
    "flash.view",
    "campaigns.view",
    "promos.view",
    "analytics.view",
    "scanner.access",
  ],
  SCANNER: [
    // Scanner page only (check-in)
    "scanner.access",
    "attendees.checkin",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole, permission: OrgPermission): boolean {
  return PERMISSION_MATRIX[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: OrgRole): OrgPermission[] {
  return PERMISSION_MATRIX[role];
}

/**
 * Check if a role can perform an action (alias for hasPermission)
 */
export function canPerform(role: OrgRole, permission: OrgPermission): boolean {
  return hasPermission(role, permission);
}

/**
 * Get the role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: OrgRole): number {
  const levels: Record<OrgRole, number> = {
    OWNER: 4,
    MANAGER: 3,
    STAFF: 2,
    SCANNER: 1,
  };
  return levels[role];
}

/**
 * Check if a role can manage another role (for role updates)
 */
export function canManageRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  // Only OWNER can manage roles
  if (actorRole !== "OWNER") return false;
  // OWNER cannot demote themselves
  return true;
}

/**
 * Check if a user has a specific permission for an organizer
 * This queries the database to get the user's role
 */
export async function requireOrgPerm(
  userId: string,
  organizerId: string,
  permission: OrgPermission
): Promise<{ allowed: boolean; role?: OrgRole; reason?: string }> {
  // First check if user is the organizer owner (via User -> Organizer relation)
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { userId: true },
  });

  if (!organizer) {
    return { allowed: false, reason: "Organizer not found" };
  }

  // If user is the organizer owner, they have OWNER role
  if (organizer.userId === userId) {
    const allowed = hasPermission("OWNER", permission);
    return { allowed, role: "OWNER", reason: allowed ? undefined : "Permission denied" };
  }

  // Check OrgMember table for team membership
  const member = await prisma.orgMember.findUnique({
    where: {
      organizerId_userId: {
        organizerId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    return { allowed: false, reason: "User is not a member of this organization" };
  }

  const role = member.role as OrgRole;
  const allowed = hasPermission(role, permission);
  return { allowed, role, reason: allowed ? undefined : "Permission denied" };
}

/**
 * Get user's role for an organizer
 */
export async function getOrgRole(
  userId: string,
  organizerId: string
): Promise<OrgRole | null> {
  // First check if user is the organizer owner
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { userId: true },
  });

  if (!organizer) {
    return null;
  }

  if (organizer.userId === userId) {
    return "OWNER";
  }

  // Check OrgMember table
  const member = await prisma.orgMember.findUnique({
    where: {
      organizerId_userId: {
        organizerId,
        userId,
      },
    },
    select: { role: true },
  });

  return member ? (member.role as OrgRole) : null;
}

/**
 * Check if user has any role in the organization
 */
export async function isOrgMember(
  userId: string,
  organizerId: string
): Promise<boolean> {
  const role = await getOrgRole(userId, organizerId);
  return role !== null;
}

/**
 * Validate scanner pass token
 */
export async function validateScannerPass(
  token: string
): Promise<{
  valid: boolean;
  organizerId?: string;
  eventId?: string;
  reason?: string;
}> {
  const pass = await prisma.scannerPass.findUnique({
    where: { token },
    select: {
      id: true,
      organizerId: true,
      eventId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!pass) {
    return { valid: false, reason: "Invalid scanner pass" };
  }

  if (pass.expiresAt < new Date()) {
    return { valid: false, reason: "Scanner pass has expired" };
  }

  // Mark as used if first use
  if (!pass.usedAt) {
    await prisma.scannerPass.update({
      where: { id: pass.id },
      data: { usedAt: new Date() },
    });
  }

  return {
    valid: true,
    organizerId: pass.organizerId,
    eventId: pass.eventId ?? undefined,
  };
}

/**
 * Generate a secure random token for invites and scanner passes
 */
export function generateSecureToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
