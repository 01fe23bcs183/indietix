import { describe, it, expect } from "vitest";
import { appRouter } from "./index";

describe("appRouter", () => {
  it("health.ping returns ok", async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.health.ping();
    expect(result).toEqual({ ok: true });
  });
});
