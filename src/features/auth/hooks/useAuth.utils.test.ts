/**
 * Tests for useAuth OAuth fallback logic.
 *
 * Pure functions only — ZERO mocks required.
 * The hook itself (WebBrowser, sessionStorage, fetch) is tested
 * via integration/E2E — unit tests cover only the pure logic.
 */

import {
  consumeWebOAuthCorrelation,
  createWebOAuthCorrelation,
  parseIdTokenFromFragment,
  shouldUseRedirectFallback,
} from "./useAuth.utils";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("parseIdTokenFromFragment", () => {
  it("extracts id_token from hash fragment", () => {
    const url =
      "https://myquota.app/callback#id_token=eyJhbGciOiJSUzI1NiJ9.abc.xyz&access_token=ya29.123";
    const result = parseIdTokenFromFragment(url);
    expect(result).not.toBeNull();
    expect(result!.idToken).toBe("eyJhbGciOiJSUzI1NiJ9.abc.xyz");
  });

  it("returns null when no hash fragment present", () => {
    const url = "https://myquota.app/callback";
    const result = parseIdTokenFromFragment(url);
    expect(result).toBeNull();
  });

  it("returns null when hash has no id_token param", () => {
    const url = "https://myquota.app/callback#access_token=ya29.123&expires_in=3600";
    const result = parseIdTokenFromFragment(url);
    expect(result).toBeNull();
  });

  it("returns null for empty hash fragment", () => {
    const url = "https://myquota.app/callback#";
    const result = parseIdTokenFromFragment(url);
    expect(result).toBeNull();
  });

  it("handles id_token with URL-encoded characters (base64url)", () => {
    const token = "header.eyJ1c2VyIjoiSm9obiJ9.sig-_=";
    const url = `https://myquota.app/?state=abc#id_token=${encodeURIComponent(token)}`;
    const result = parseIdTokenFromFragment(url);
    expect(result).not.toBeNull();
    // URLSearchParams.get auto-decodes the value
    expect(result!.idToken).toBe(token);
  });

  it("handles hash without id_token but with other fragment content", () => {
    const url = "https://myquota.app/callback#page=profile&tab=settings";
    const result = parseIdTokenFromFragment(url);
    expect(result).toBeNull();
  });
});

describe("shouldUseRedirectFallback", () => {
  it("returns true when popup is cancelled", () => {
    expect(shouldUseRedirectFallback({ type: "cancel" })).toBe(true);
  });

  it("returns true when popup is dismissed", () => {
    expect(shouldUseRedirectFallback({ type: "dismiss" })).toBe(true);
  });

  it("returns true when popup is locked (blocked)", () => {
    expect(shouldUseRedirectFallback({ type: "locked" })).toBe(true);
  });

  it("returns false when popup succeeds", () => {
    expect(shouldUseRedirectFallback({ type: "success" })).toBe(false);
  });
});

describe("web OAuth correlation", () => {
  const storageKey = "oauth_web_correlation";
  const fixedNow = 1_000_000;

  it("generates distinct state and verifier values through Web Crypto", () => {
    const getRandomValues = jest.fn((values: Uint8Array) => {
      values.fill(getRandomValues.mock.calls.length);
      return values;
    });
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues },
    });

    try {
      const first = createWebOAuthCorrelation(fixedNow);
      const second = createWebOAuthCorrelation(fixedNow);

      expect(getRandomValues).toHaveBeenCalledTimes(4);
      expect(first.state).not.toBe(first.codeVerifier);
      expect(first.state).not.toBe(second.state);
      expect(first.createdAt).toBe(fixedNow);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("consumes a valid state once and returns its verifier", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      storageKey,
      JSON.stringify({
        state: "expected-state",
        codeVerifier: "expected-verifier",
        createdAt: fixedNow,
      }),
    );

    expect(
      consumeWebOAuthCorrelation(
        storage,
        storageKey,
        "expected-state",
        fixedNow,
      ),
    ).toEqual({ codeVerifier: "expected-verifier" });
    expect(storage.getItem(storageKey)).toBeNull();
  });

  it("rejects a state mismatch and clears the correlation", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      storageKey,
      JSON.stringify({
        state: "expected-state",
        codeVerifier: "expected-verifier",
        createdAt: fixedNow,
      }),
    );

    expect(
      consumeWebOAuthCorrelation(
        storage,
        storageKey,
        "unexpected-state",
        fixedNow,
      ),
    ).toEqual({ error: "invalid_state" });
    expect(storage.getItem(storageKey)).toBeNull();
  });

  it("rejects expired correlations and clears stored data", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      storageKey,
      JSON.stringify({
        state: "expected-state",
        codeVerifier: "expected-verifier",
        createdAt: fixedNow - 600_001,
      }),
    );

    expect(
      consumeWebOAuthCorrelation(
        storage,
        storageKey,
        "expected-state",
        fixedNow,
      ),
    ).toEqual({ error: "invalid_state" });
    expect(storage.getItem(storageKey)).toBeNull();
  });
});
