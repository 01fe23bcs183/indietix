import { describe, it, expect } from "vitest";

type Role = "CUSTOMER" | "ORGANIZER" | "ADMIN";
type Route = "/organizer" | "/admin" | "/";

function canAccess(route: Route, role: Role): boolean {
  if (route === "/organizer") {
    return role === "ORGANIZER" || role === "ADMIN";
  }

  if (route === "/admin") {
    return role === "ADMIN";
  }

  return true;
}

describe("RBAC (Role-Based Access Control)", () => {
  describe("canAccess helper function", () => {
    it("should allow CUSTOMER to access public routes", () => {
      expect(canAccess("/", "CUSTOMER")).toBe(true);
    });

    it("should deny CUSTOMER access to /organizer", () => {
      expect(canAccess("/organizer", "CUSTOMER")).toBe(false);
    });

    it("should deny CUSTOMER access to /admin", () => {
      expect(canAccess("/admin", "CUSTOMER")).toBe(false);
    });

    it("should allow ORGANIZER to access public routes", () => {
      expect(canAccess("/", "ORGANIZER")).toBe(true);
    });

    it("should allow ORGANIZER to access /organizer", () => {
      expect(canAccess("/organizer", "ORGANIZER")).toBe(true);
    });

    it("should deny ORGANIZER access to /admin", () => {
      expect(canAccess("/admin", "ORGANIZER")).toBe(false);
    });

    it("should allow ADMIN to access public routes", () => {
      expect(canAccess("/", "ADMIN")).toBe(true);
    });

    it("should allow ADMIN to access /organizer", () => {
      expect(canAccess("/organizer", "ADMIN")).toBe(true);
    });

    it("should allow ADMIN to access /admin", () => {
      expect(canAccess("/admin", "ADMIN")).toBe(true);
    });
  });

  describe("RBAC matrix", () => {
    const roles: Role[] = ["CUSTOMER", "ORGANIZER", "ADMIN"];
    const routes: Route[] = ["/", "/organizer", "/admin"];

    const expectedAccess: Record<Role, Record<Route, boolean>> = {
      CUSTOMER: {
        "/": true,
        "/organizer": false,
        "/admin": false,
      },
      ORGANIZER: {
        "/": true,
        "/organizer": true,
        "/admin": false,
      },
      ADMIN: {
        "/": true,
        "/organizer": true,
        "/admin": true,
      },
    };

    roles.forEach((role) => {
      routes.forEach((route) => {
        it(`should ${expectedAccess[role][route] ? "allow" : "deny"} ${role} access to ${route}`, () => {
          expect(canAccess(route, role)).toBe(expectedAccess[role][route]);
        });
      });
    });
  });
});
