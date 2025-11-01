/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@indietix/db", () => {
  const mockUsers = new Map<string, any>();
  const mockOrganizers = new Map<string, any>();

  return {
    prisma: {
      user: {
        findUnique: vi.fn(({ where }: any) => {
          return Promise.resolve(mockUsers.get(where.id) || null);
        }),
        findMany: vi.fn(() => Promise.resolve(Array.from(mockUsers.values()))),
        count: vi.fn(() => Promise.resolve(mockUsers.size)),
        update: vi.fn(({ where, data }: any) => {
          const user = mockUsers.get(where.id);
          if (!user) return Promise.resolve(null);
          const updated = { ...user, ...data };
          mockUsers.set(where.id, updated);
          return Promise.resolve(updated);
        }),
      },
      organizer: {
        findMany: vi.fn(() =>
          Promise.resolve(Array.from(mockOrganizers.values()))
        ),
        count: vi.fn(() => Promise.resolve(mockOrganizers.size)),
      },
      event: {
        findMany: vi.fn(() => Promise.resolve([])),
        count: vi.fn(() => Promise.resolve(0)),
      },
      booking: {
        findMany: vi.fn(() => Promise.resolve([])),
        count: vi.fn(() => Promise.resolve(0)),
      },
      adminAction: {
        create: vi.fn(() => Promise.resolve({ id: "action-1" })),
      },
    },
    __mockUsers: mockUsers,
    __mockOrganizers: mockOrganizers,
  };
});

const { appRouter } = await import("../index");
const { __mockUsers } = (await import("@indietix/db")) as any;

describe("Admin RBAC", () => {
  const createCaller = (userId: string | null, role: string = "ADMIN") => {
    if (userId) {
      __mockUsers.set(userId, {
        id: userId,
        email: `${userId}@test.com`,
        role,
      });
    }
    return appRouter.createCaller({
      session: userId
        ? { user: { id: userId, email: "", role: "" } }
        : undefined,
    });
  };

  beforeEach(() => {
    __mockUsers.clear();
  });

  it("should allow admin to access admin routes", async () => {
    const caller = createCaller("admin-1", "ADMIN");

    const result = await caller.admin.users.list({
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(result.users).toHaveLength(1);
    expect(result.users[0]?.id).toBe("admin-1");
  });

  it("should reject customer from admin routes", async () => {
    const caller = createCaller("customer-1", "CUSTOMER");

    await expect(
      caller.admin.users.list({
        page: 1,
        limit: 10,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should reject organizer from admin routes", async () => {
    const caller = createCaller("organizer-1", "ORGANIZER");

    await expect(
      caller.admin.users.list({
        page: 1,
        limit: 10,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should reject unauthenticated users from admin routes", async () => {
    const caller = createCaller(null);

    await expect(
      caller.admin.users.list({
        page: 1,
        limit: 10,
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
