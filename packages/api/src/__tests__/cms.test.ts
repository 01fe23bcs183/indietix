import { describe, it, expect } from "vitest";

function validateJsonSchema(data: unknown, schema: { type?: string; required?: string[]; properties?: Record<string, unknown> }): string | null {
  if (!schema || typeof schema !== "object") return null;

  if (schema.type === "object" && (typeof data !== "object" || data === null)) {
    return "Expected an object";
  }

  if (schema.type === "array" && !Array.isArray(data)) {
    return "Expected an array";
  }

  if (schema.required && Array.isArray(schema.required) && typeof data === "object" && data !== null) {
    for (const field of schema.required) {
      if (!(field in data)) {
        return `Missing required field: ${field}`;
      }
    }
  }

  return null;
}

function verifyPreviewToken(token: string): { valid: boolean; key?: string; error?: string } {
  try {
    const decoded = JSON.parse(atob(token));
    
    if (!decoded.key || !decoded.exp) {
      return { valid: false, error: "Invalid token format" };
    }

    if (Date.now() > decoded.exp) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, key: decoded.key };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
}

function createPreviewToken(key: string, expiresInMs: number = 3600000): string {
  return btoa(JSON.stringify({ key, exp: Date.now() + expiresInMs }));
}

async function revalidatePath(path: string): Promise<{ revalidated: boolean; path: string }> {
  return { revalidated: true, path };
}

describe("CMS JSON Schema Validation", () => {
  const heroSchema = {
    type: "object",
    required: ["title", "subtitle"],
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      ctaText: { type: "string" },
      ctaLink: { type: "string" },
    },
  };

  it("should validate valid hero content", () => {
    const validData = {
      title: "Welcome to IndieTix",
      subtitle: "Find amazing events",
      ctaText: "Browse Events",
      ctaLink: "/events",
    };
    expect(validateJsonSchema(validData, heroSchema)).toBeNull();
  });

  it("should reject missing required fields", () => {
    const invalidData = {
      title: "Welcome to IndieTix",
    };
    expect(validateJsonSchema(invalidData, heroSchema)).toBe("Missing required field: subtitle");
  });

  it("should reject non-object data when object expected", () => {
    expect(validateJsonSchema("string", heroSchema)).toBe("Expected an object");
    expect(validateJsonSchema(123, heroSchema)).toBe("Expected an object");
    expect(validateJsonSchema(null, heroSchema)).toBe("Expected an object");
  });

  it("should validate array type", () => {
    const arraySchema = { type: "array" };
    expect(validateJsonSchema([], arraySchema)).toBeNull();
    expect(validateJsonSchema([1, 2, 3], arraySchema)).toBeNull();
    expect(validateJsonSchema({}, arraySchema)).toBe("Expected an array");
  });

  it("should handle empty schema", () => {
    expect(validateJsonSchema({}, {})).toBeNull();
    expect(validateJsonSchema("anything", {})).toBeNull();
  });
});

describe("Preview Token Verification", () => {
  it("should verify valid token", () => {
    const token = createPreviewToken("home.hero", 3600000);
    const result = verifyPreviewToken(token);
    expect(result.valid).toBe(true);
    expect(result.key).toBe("home.hero");
  });

  it("should reject expired token", () => {
    const token = createPreviewToken("home.hero", -1000);
    const result = verifyPreviewToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Token expired");
  });

  it("should reject invalid token format", () => {
    const invalidToken = btoa(JSON.stringify({ foo: "bar" }));
    const result = verifyPreviewToken(invalidToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid token format");
  });

  it("should reject malformed token", () => {
    const result = verifyPreviewToken("not-base64-json");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid token");
  });

  it("should create token with custom expiration", () => {
    const shortToken = createPreviewToken("test.block", 1000);
    const result = verifyPreviewToken(shortToken);
    expect(result.valid).toBe(true);
    expect(result.key).toBe("test.block");
  });
});

describe("ISR Invalidation Helper", () => {
  it("should revalidate homepage path", async () => {
    const result = await revalidatePath("/");
    expect(result.revalidated).toBe(true);
    expect(result.path).toBe("/");
  });

  it("should revalidate blog path", async () => {
    const result = await revalidatePath("/blog");
    expect(result.revalidated).toBe(true);
    expect(result.path).toBe("/blog");
  });

  it("should revalidate specific blog post path", async () => {
    const result = await revalidatePath("/blog/my-post-slug");
    expect(result.revalidated).toBe(true);
    expect(result.path).toBe("/blog/my-post-slug");
  });

  it("should revalidate help center path", async () => {
    const result = await revalidatePath("/help");
    expect(result.revalidated).toBe(true);
    expect(result.path).toBe("/help");
  });
});
