import { describe, it, expect } from "vitest";
import { formatCurrency, slugify, truncate } from "../index";

describe("formatCurrency", () => {
  it("formats Indian currency correctly", () => {
    expect(formatCurrency(1000)).toBe("₹1,000.00");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("₹0.00");
  });
});

describe("slugify", () => {
  it("converts text to slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("handles special characters", () => {
    expect(slugify("Test @ Event # 2024")).toBe("test-event-2024");
  });
});

describe("truncate", () => {
  it("truncates long text", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("does not truncate short text", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
});
