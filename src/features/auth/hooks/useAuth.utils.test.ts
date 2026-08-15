/**
 * Tests for useAuth OAuth fallback logic.
 *
 * Pure functions only — ZERO mocks required.
 * The hook itself (WebBrowser, sessionStorage, fetch) is tested
 * via integration/E2E — unit tests cover only the pure logic.
 */

import { parseIdTokenFromFragment, shouldUseRedirectFallback } from "./useAuth.utils";

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
    expect(
      shouldUseRedirectFallback({ type: "success" })
    ).toBe(false);
  });
});
