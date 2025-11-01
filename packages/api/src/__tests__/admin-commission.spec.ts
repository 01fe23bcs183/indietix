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
      },
      organizer: {
        findUnique: vi.fn(({ where, include }: any) => {
          const organizer = mockOrganizers.get(where.id);
          if (!organizer) return Promise.resolve(null);

          if (include?.user) {
            return Promise.resolve({
              ...organizer,
              user: mockUsers.get(organizer.userId) || {
                id: organizer.userId,
                name: "Mock User",
                email: "mock@test.com",
              },
            });
          }
          return Promise.resolve(organizer);
        }),
        update: vi.fn(({ where, data }: any) => {
          const organizer = mockOrganizers.get(where.id);
          if (!organizer) return Promise.resolve(null);
          const updated = { ...organizer, ...data };
          mockOrganizers.set(where.id, updated);
          return Promise.resolve(updated);
        }),
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
const { __mockUsers, __mockOrganizers } = (await import("@indietix/db")) as any;

describe("Admin Commission Override", () => {
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
    __mockOrganizers.clear();
  });

  it("should allow admin to set commission override", async () => {
    __mockOrganizers.set("org-1", {
      id: "org-1",
      userId: "user-1",
      businessName: "Test Organizer",
      commissionOverride: null,
    });

    const caller = createCaller("admin-1", "ADMIN");

    const result = await caller.admin.organizers.setCommissionOverride({
      id: "org-1",
      commissionOverride: 5.5,
    });

    expect(result.commissionOverride).toBe(5.5);

    const saved = __mockOrganizers.get("org-1");
    expect(saved?.commissionOverride).toBe(5.5);
  });

  it("should allow admin to clear commission override", async () => {
    __mockOrganizers.set("org-2", {
      id: "org-2",
      userId: "user-2",
      businessName: "Test Organizer 2",
      commissionOverride: 5.5,
    });

    const caller = createCaller("admin-2", "ADMIN");

    const result = await caller.admin.organizers.setCommissionOverride({
      id: "org-2",
      commissionOverride: null,
    });

    expect(result.commissionOverride).toBeNull();

    const saved = __mockOrganizers.get("org-2");
    expect(saved?.commissionOverride).toBeNull();
  });

  it("should reject non-admin users from setting commission override", async () => {
    __mockOrganizers.set("org-3", {
      id: "org-3",
      userId: "user-3",
      businessName: "Test Organizer 3",
      commissionOverride: null,
    });

    const caller = createCaller("customer-1", "CUSTOMER");

    await expect(
      caller.admin.organizers.setCommissionOverride({
        id: "org-3",
        commissionOverride: 5.5,
      })
    ).rejects.toThrow("Admin access required");
  });
});
