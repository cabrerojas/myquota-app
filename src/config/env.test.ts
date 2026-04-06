/**
 * Unit tests for src/config/env.ts
 * Validates Zod schema behavior for valid/missing/invalid env vars.
 */

describe("env.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    // Clear module cache so env is re-parsed
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    EXPO_PUBLIC_API_BASE_URL: "https://myquota-backend.onrender.com/api",
    EXPO_PUBLIC_APP_SCHEME: "myapp",
    EXPO_PUBLIC_EAS_PROJECT_ID: "884de3cf-9b57-472a-ad66-7a8660686ae0",
    EXPO_PUBLIC_EXPO_UPDATES_URL: "https://u.expo.dev/884de3cf-9b57-472a-ad66-7a8660686ae0",
    EXPO_PUBLIC_WEB_CLIENT_ID: "843354250947-or01hgaotco18ounocgpakr6v2usdhkj.apps.googleusercontent.com",
    EXPO_PUBLIC_IOS_CLIENT_ID: "843354250947-l6dap3uvdlcmd0hpasiinupavvo1cvcv.apps.googleusercontent.com",
    EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: "com.googleusercontent.apps.843354250947-l6dap3uvdlcmd0hpasiinupavvo1cvcv",
  };

  it("should pass with valid env vars", () => {
    Object.assign(process.env, validEnv);
    const { env } = require("@/config/env");
    expect(env.EXPO_PUBLIC_API_BASE_URL).toBe(validEnv.EXPO_PUBLIC_API_BASE_URL);
    expect(env.EXPO_PUBLIC_APP_SCHEME).toBe("myapp");
  });

  it("should throw clear error for missing variable", () => {
    // Only set one var, missing the rest
    process.env.EXPO_PUBLIC_API_BASE_URL = validEnv.EXPO_PUBLIC_API_BASE_URL;
    expect(() => require("@/config/env")).toThrow(/Missing or invalid environment variables/);
  });

  it("should reject invalid URL format for API_BASE_URL", () => {
    Object.assign(process.env, validEnv);
    process.env.EXPO_PUBLIC_API_BASE_URL = "not-a-valid-url";
    expect(() => require("@/config/env")).toThrow();
  });

  it("should reject invalid UUID for EAS_PROJECT_ID", () => {
    Object.assign(process.env, validEnv);
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = "not-a-uuid";
    expect(() => require("@/config/env")).toThrow();
  });

  it("should export typed Env singleton", () => {
    Object.assign(process.env, validEnv);
    const { env, Env } = require("@/config/env");
    expect(typeof env.EXPO_PUBLIC_APP_SCHEME).toBe("string");
    expect(typeof Env).toBe("object"); // Zod-inferred type
  });
});
