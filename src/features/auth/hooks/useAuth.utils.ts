/**
 * Pure utility functions for OAuth flows.
 *
 * Extracted from useAuth.ts so they can be unit-tested
 * with ZERO mocks — no native modules, no side effects.
 */

/**
 * Extracts the id_token from a redirect URL's hash fragment.
 *
 * @param url — The full redirect URL (e.g. "https://myquota.app/callback#id_token=abc&access_token=xyz")
 * @returns The id_token value, or null if not found
 */
export function parseIdTokenFromFragment(url: string): { idToken: string } | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get("id_token");
  if (!idToken) return null;
  return { idToken };
}

const WEB_OAUTH_CORRELATION_TTL_MS = 10 * 60 * 1000;

interface WebOAuthCorrelation {
  readonly codeVerifier: string;
  readonly createdAt: number;
  readonly state: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

function generateWebCryptoValue(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createWebOAuthCorrelation(
  createdAt = Date.now(),
): WebOAuthCorrelation {
  return {
    state: generateWebCryptoValue(),
    codeVerifier: generateWebCryptoValue(),
    createdAt,
  };
}

export function consumeWebOAuthCorrelation(
  storage: StorageLike,
  storageKey: string,
  receivedState: string | null,
  now = Date.now(),
): { codeVerifier: string } | { error: "invalid_state" } {
  const serializedCorrelation = storage.getItem(storageKey);
  storage.removeItem(storageKey);

  if (!serializedCorrelation || !receivedState) {
    return { error: "invalid_state" };
  }

  try {
    const correlation = JSON.parse(
      serializedCorrelation,
    ) as WebOAuthCorrelation;
    const isExpired =
      !Number.isFinite(correlation.createdAt) ||
      now - correlation.createdAt > WEB_OAUTH_CORRELATION_TTL_MS;

    if (
      isExpired ||
      correlation.state !== receivedState ||
      !correlation.codeVerifier
    ) {
      return { error: "invalid_state" };
    }

    return { codeVerifier: correlation.codeVerifier };
  } catch {
    return { error: "invalid_state" };
  }
}

export interface WebBrowserResultShape {
  readonly type: "success" | "cancel" | "dismiss" | "locked";
}

/**
 * Determines whether the OAuth popup failed and a redirect
 * fallback should be used.
 *
 * @param result — The result from WebBrowser.openAuthSessionAsync
 * @returns true if popup failed (cancel, dismiss, locked), false if success
 */
export function shouldUseRedirectFallback(result: WebBrowserResultShape): boolean {
  return result.type !== "success";
}
