import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth";

describe("Authentication", () => {
  describe("bcrypt password hashing", () => {
    it("should hash a password correctly", async () => {
      const password = "testPassword123";
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });

    it("should generate different hashes for same password", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });
});
