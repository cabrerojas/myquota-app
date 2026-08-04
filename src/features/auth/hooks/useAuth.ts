import { useState, useCallback } from "react";
import { Platform } from "react-native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Router } from "expo-router";
import { API_BASE_URL } from "@/config/api";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  persistSession,
} from "@/features/auth/services/sessionStorage";
import {
  emitSessionExpired,
  isSessionExpired,
  resetSessionExpired,
} from "@/shared/utils/authEvents";
import {
  parseIdTokenFromFragment,
  shouldUseRedirectFallback,
} from "./useAuth.utils";

const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;

// ── PKCE helpers ───────────────────────────────────────────────────────────

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64Url(digest);
}

// ── Native-only configuration ──────────────────────────────────────────────
if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: webClientId,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    iosClientId: iosClientId,
  });
}

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri();

/**
 * Authenticates with the backend. Supports two flows:
 * - Native: sends idToken directly
 * - Web (code flow): sends authorization code + code_verifier (PKCE)
 */
async function authenticateWithBackend(
  idToken: string | null,
  serverAuthCode: string | undefined,
  user: { givenName?: string | null; familyName?: string | null; email?: string | null; photo?: string | null },
  router: Router,
  nonce?: string,
  code?: string,
  codeVerifier?: string,
  redirectUri?: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const body: Record<string, string> = {};

    if (code) {
      body.code = code;
      if (codeVerifier) body.codeVerifier = codeVerifier;
      if (redirectUri) body.redirectUri = redirectUri;
    } else if (idToken) {
      body.token = idToken;
      if (serverAuthCode) body.serverAuthCode = serverAuthCode;
      if (nonce) body.nonce = nonce;
    }

    const res = await fetch(`${API_BASE_URL}/login/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json();

    if (data.accessToken) {
      console.log("Access token recibido");
      resetSessionExpired();
      await persistSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          givenName: user.givenName ?? undefined,
          familyName: user.familyName ?? undefined,
          email: user.email ?? undefined,
          photo: user.photo ?? undefined,
        },
      });
      router.replace("/");
    } else {
      console.error("Error al autenticar con el backend:", data);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export const useGoogleSignIn = (router: Router) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web") {
        // ── Web OAuth: Authorization Code + PKCE (OAuth 2.1, modern flow) ──
        console.log("Iniciando sesión con Google (web)...");

        const redirectUri = window.location.origin + "/login";
        const codeVerifier = Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        sessionStorage.setItem("oauth_code_verifier", codeVerifier);

        const authUrl =
          "https://accounts.google.com/o/oauth2/v2/auth?" +
          new URLSearchParams({
            client_id: webClientId ?? "",
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid profile email https://www.googleapis.com/auth/gmail.readonly",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            access_type: "offline",
            prompt: "consent",
          }).toString();

        sessionStorage.setItem("oauth_return", "1");
        window.location.href = authUrl;
        return;
      } else {
        // ── Native flow (unchanged) ─────────
        console.log("Iniciando sesión con Google...");
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (isSuccessResponse(response)) {
          const { idToken, user, serverAuthCode } = response.data;
          if (!idToken) {
            console.error("Error: No se obtuvo el idToken de Google.");
            return;
          }
          console.log("idToken obtenido:", idToken);
          console.log("serverAuthCode obtenido:", serverAuthCode ? "✅" : "❌ no disponible");
          await authenticateWithBackend(idToken, serverAuthCode ?? undefined, user, router);
        }
      }
    } catch (error) {
      console.error("Error en Google Sign-In:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return { signIn: handleSignIn, isLoading };
};

/**
 * Parses OAuth redirect return (authorization code flow).
 *
 * Called on LoginScreen mount when Platform.OS === "web".
 * Extracts authorization code from URL query params,
 * reads code_verifier from sessionStorage, authenticates,
 * and cleans the URL.
 */
export async function parseOAuthReturn(router: Router): Promise<void> {
  const isReturn = sessionStorage.getItem("oauth_return") === "1";
  if (!isReturn) return;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    // Fallback: try legacy id_token hash flow
    const tokenResult = parseIdTokenFromFragment(window.location.href);
    if (!tokenResult) return;

    const payload = JSON.parse(atob(tokenResult.idToken.split(".")[1]));
    const nonce: string | undefined = payload.nonce;
    await authenticateWithBackend(
      tokenResult.idToken,
      undefined,
      {
        givenName: payload.given_name,
        familyName: payload.family_name,
        email: payload.email,
        photo: payload.picture,
      },
      router,
      nonce,
    );

    sessionStorage.removeItem("oauth_return");
    window.history.replaceState(null, "", "/");
    return;
  }

  const codeVerifier = sessionStorage.getItem("oauth_code_verifier") ?? undefined;
  const redirectUri = window.location.origin + "/login";

  await authenticateWithBackend(
    null,
    undefined,
    {},
    router,
    undefined,
    code,
    codeVerifier,
    redirectUri,
  );

  // Clean up
  sessionStorage.removeItem("oauth_return");
  sessionStorage.removeItem("oauth_code_verifier");
  window.history.replaceState(null, "", "/");
}

export const signOut = async (router: Router) => {
  try {
    // Revocar refresh token en el backend antes de limpiar localmente
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Si falla la revocación, continuar con el logout local
    }

    if (Platform.OS !== "web") {
      await GoogleSignin.signOut();
    }
    await clearSession();

    router.replace("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    await clearSession();
    router.replace("/login");
  }
};

export const getAuthHeaders = async () => {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function attemptRefresh() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    // limpiar sesión local si no hay refresh token para forzar login
    try {
      await clearSession();
    } catch (e) {
      console.warn("Error clearing storage when missing refresh token:", e);
    }
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API_BASE_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed");
  const data = await res.json();
  if (data.accessToken) {
    try {
      await persistSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch (err) {
      console.warn("Session storage setItemAsync error:", err);
    }

    return data.accessToken;
  }
  throw new Error("Invalid refresh response");
}

export class SessionExpiredError extends Error {
  constructor() {
    super("SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

export async function requestWithAuth(input: RequestInfo, init?: RequestInit) {
  if (isSessionExpired()) {
    throw new SessionExpiredError();
  }

  const headers = {
    ...((init?.headers as Record<string, string>) || {}),
    ...(await getAuthHeaders()),
  };
  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    try {
      await attemptRefresh();
      const headers2 = {
        ...((init?.headers as Record<string, string>) || {}),
        ...(await getAuthHeaders()),
      };
      res = await fetch(input, { ...init, headers: headers2 });
    } catch {
      await clearSession();
      emitSessionExpired();
      throw new SessionExpiredError();
    }
  }

  return res;
}
