import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getPermissions,
  canPerform,
  getRoleLevel,
  canManageRole,
  generateSecureToken,
  PERMISSION_MATRIX,
} from "../perm";
import type { OrgRole } from "../perm";

describe("RBAC Permissions", () => {
  describe("hasPermission", () => {
    it("OWNER should have all permissions", () => {
      const ownerPerms = PERMISSION_MATRIX.OWNER;
      ownerPerms.forEach((perm) => {
        expect(hasPermission("OWNER", perm)).toBe(true);
      });
    });

    it("MANAGER should have event.create permission", () => {
      expect(hasPermission("MANAGER", "event.create")).toBe(true);
    });

    it("MANAGER should not have team.invite permission", () => {
      expect(hasPermission("MANAGER", "team.invite")).toBe(false);
    });

    it("STAFF should have event.view permission", () => {
      expect(hasPermission("STAFF", "event.view")).toBe(true);
    });

    it("STAFF should not have event.create permission", () => {
      expect(hasPermission("STAFF", "event.create")).toBe(false);
    });

    it("SCANNER should only have scanner.access and attendees.checkin", () => {
      expect(hasPermission("SCANNER", "scanner.access")).toBe(true);
      expect(hasPermission("SCANNER", "attendees.checkin")).toBe(true);
      expect(hasPermission("SCANNER", "event.view")).toBe(false);
      expect(hasPermission("SCANNER", "attendees.view")).toBe(false);
    });
  });

  describe("getPermissions", () => {
    it("should return all permissions for OWNER", () => {
      const perms = getPermissions("OWNER");
      expect(perms.length).toBeGreaterThan(0);
      expect(perms).toContain("event.create");
      expect(perms).toContain("team.invite");
    });

    it("should return limited permissions for SCANNER", () => {
      const perms = getPermissions("SCANNER");
      expect(perms.length).toBe(2);
      expect(perms).toContain("scanner.access");
      expect(perms).toContain("attendees.checkin");
    });
  });

  describe("canPerform", () => {
    it("should be an alias for hasPermission", () => {
      expect(canPerform("OWNER", "event.create")).toBe(
        hasPermission("OWNER", "event.create")
      );
      expect(canPerform("SCANNER", "event.create")).toBe(
        hasPermission("SCANNER", "event.create")
      );
    });
  });

  describe("getRoleLevel", () => {
    it("should return correct hierarchy levels", () => {
      expect(getRoleLevel("OWNER")).toBe(4);
      expect(getRoleLevel("MANAGER")).toBe(3);
      expect(getRoleLevel("STAFF")).toBe(2);
      expect(getRoleLevel("SCANNER")).toBe(1);
    });

    it("OWNER should have highest level", () => {
      const roles: OrgRole[] = ["OWNER", "MANAGER", "STAFF", "SCANNER"];
      const ownerLevel = getRoleLevel("OWNER");
      roles.forEach((role) => {
        expect(ownerLevel).toBeGreaterThanOrEqual(getRoleLevel(role));
      });
    });
  });

  describe("canManageRole", () => {
    it("OWNER can manage all roles", () => {
      expect(canManageRole("OWNER", "MANAGER")).toBe(true);
      expect(canManageRole("OWNER", "STAFF")).toBe(true);
      expect(canManageRole("OWNER", "SCANNER")).toBe(true);
    });

    it("non-OWNER cannot manage roles", () => {
      expect(canManageRole("MANAGER", "STAFF")).toBe(false);
      expect(canManageRole("STAFF", "SCANNER")).toBe(false);
      expect(canManageRole("SCANNER", "SCANNER")).toBe(false);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate a 32-character token", () => {
      const token = generateSecureToken();
      expect(token.length).toBe(32);
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it("should only contain alphanumeric characters", () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe("Permission Matrix Consistency", () => {
    it("OWNER should have all permissions that MANAGER has", () => {
      const managerPerms = PERMISSION_MATRIX.MANAGER;
      managerPerms.forEach((perm) => {
        expect(
          PERMISSION_MATRIX.OWNER.includes(perm),
          `OWNER should have ${perm}`
        ).toBe(true);
      });
    });

    it("MANAGER should have all permissions that STAFF has", () => {
      const staffPerms = PERMISSION_MATRIX.STAFF;
      staffPerms.forEach((perm) => {
        expect(
          PERMISSION_MATRIX.MANAGER.includes(perm),
          `MANAGER should have ${perm}`
        ).toBe(true);
      });
    });

    it("STAFF should have scanner.access", () => {
      expect(PERMISSION_MATRIX.STAFF).toContain("scanner.access");
    });
  });
});
