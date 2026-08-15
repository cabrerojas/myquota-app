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
