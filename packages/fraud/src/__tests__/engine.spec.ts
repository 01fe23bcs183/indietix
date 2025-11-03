import { describe, it, expect } from "vitest";

describe("Fraud Engine", () => {
  it("should export evaluate function", async () => {
    const { evaluate } = await import("../engine");
    expect(typeof evaluate).toBe("function");
  });

  it("should export required types", async () => {
    const module = await import("../engine");
    expect(module).toHaveProperty("evaluate");
  });
});
