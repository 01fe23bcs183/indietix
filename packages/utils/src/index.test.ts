import { describe, it, expect } from "vitest";
import { formatCurrency, slugify, truncate } from "./index";

describe("formatCurrency", () => {
  it("formats Indian currency correctly", () => {
    expect(formatCurrency(1000)).toBe("₹1,000.00");
  });
});

describe("slugify", () => {
  it("converts text to slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
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
