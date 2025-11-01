import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@indietix/db", () => {
  const mockSettings = new Map<string, any>();
  const mockUsers = new Map<string, any>();
  
  return {
    prisma: {
      platformSetting: {
        findUnique: vi.fn(({ where }: any) => {
          return Promise.resolve(mockSettings.get(where.key) || null);
        }),
        upsert: vi.fn(({ where, create, update }: any) => {
          const existing = mockSettings.get(where.key);
          const setting = {
            key: where.key,
            value: existing ? update.value : create.value,
            updatedAt: new Date(),
          };
          mockSettings.set(where.key, setting);
          return Promise.resolve(setting);
        }),
        deleteMany: vi.fn(() => {
          mockSettings.clear();
          return Promise.resolve({ count: 0 });
        }),
      },
      user: {
        findUnique: vi.fn(({ where }: any) => {
          return Promise.resolve(mockUsers.get(where.id) || null);
        }),
      },
      adminAction: {
        create: vi.fn(() => Promise.resolve({ id: "action-1" })),
      },
    },
    __mockSettings: mockSettings,
    __mockUsers: mockUsers,
  };
});

const { appRouter } = await import("../index");
const { __mockSettings, __mockUsers } = await import("@indietix/db") as any;

describe("Admin Settings Router", () => {
  const createCaller = (userId: string | null, role: string = "ADMIN") => {
    if (userId) {
      __mockUsers.set(userId, { id: userId, role });
    }
    return appRouter.createCaller({
      session: userId ? { user: { id: userId, email: "", role: "" } } : undefined,
    });
  };

  beforeEach(async () => {
    __mockSettings.clear();
    __mockUsers.clear();
  });

  it("should allow admin to set fees", async () => {
    const caller = createCaller("admin-1", "ADMIN");

    const result = await caller.admin.settings.setFees({
      paymentGateway: 3,
      serverMaintenance: 3,
      platformSupport: 12,
    });

    expect(result.key).toBe("fees");
    expect(result.value).toEqual({
      paymentGateway: 3,
      serverMaintenance: 3,
      platformSupport: 12,
    });

    const saved = __mockSettings.get("fees");
    expect(saved?.value).toEqual({
      paymentGateway: 3,
      serverMaintenance: 3,
      platformSupport: 12,
    });
  });

  it("should allow admin to set GST rate", async () => {
    const caller = createCaller("admin-2", "ADMIN");

    const result = await caller.admin.settings.setGstRate({
      gstRate: 0.2,
    });

    expect(result.key).toBe("gstRate");
    expect(result.value).toBe(0.2);
  });

  it("should reject non-admin users", async () => {
    const caller = createCaller("customer-1", "CUSTOMER");

    await expect(
      caller.admin.settings.setFees({
        paymentGateway: 3,
        serverMaintenance: 3,
        platformSupport: 12,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should reject unauthenticated users", async () => {
    const caller = createCaller(null);

    await expect(
      caller.admin.settings.getFees()
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
