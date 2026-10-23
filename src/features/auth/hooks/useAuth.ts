import { useState, useCallback } from "react";
import { Platform } from "react-native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/api";
import {
  buildGoogleAuthUrl,
  getGoogleAuthRedirectUri,
  googleAuthConfig,
  googleAuthRuntimeConfig,
} from "@/config/auth";
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
  consumeWebOAuthCorrelation,
  createWebOAuthCorrelation,
} from "./useAuth.utils";

type AppRouter = ReturnType<typeof useRouter>;

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
    webClientId: googleAuthConfig.webClientId,
    scopes: [...googleAuthConfig.scopes],
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    iosClientId: googleAuthConfig.iosClientId,
  });
}

WebBrowser.maybeCompleteAuthSession();

/**
 * Authenticates with the backend. Supports two flows:
 * - Native: sends idToken directly
 * - Web (code flow): sends authorization code + code_verifier (PKCE)
 */
async function authenticateWithBackend(
  idToken: string | null,
  serverAuthCode: string | undefined,
  user: {
    givenName?: string | null;
    familyName?: string | null;
    email?: string | null;
    photo?: string | null;
  },
  router: AppRouter,
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
      console.error("Backend authentication failed.");
    }
  } finally {
    clearTimeout(timeout);
  }
}

export const useGoogleSignIn = (router: AppRouter) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web") {
        // ── Web OAuth: Authorization Code + PKCE (OAuth 2.1, modern flow) ──
        console.log("Iniciando sesión con Google (web)...");

        const correlation = createWebOAuthCorrelation();
        const codeChallenge = await generateCodeChallenge(
          correlation.codeVerifier,
        );

        sessionStorage.setItem(
          googleAuthRuntimeConfig.storageKeys.correlation,
          JSON.stringify(correlation),
        );

        const authUrl = buildGoogleAuthUrl({
          origin: window.location.origin,
          codeChallenge,
          state: correlation.state,
        });

        sessionStorage.setItem(
          googleAuthRuntimeConfig.storageKeys.returnFlag,
          "1",
        );
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
          await authenticateWithBackend(
            idToken,
            serverAuthCode ?? undefined,
            user,
            router,
          );
        }
      }
    } catch {
      console.error("Google Sign-In failed.");
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
 * validates and consumes the stored state/verifier correlation,
 * authenticates, and cleans the URL.
 */
export async function parseOAuthReturn(
  router: AppRouter,
): Promise<string | null> {
  const isReturn =
    sessionStorage.getItem(googleAuthRuntimeConfig.storageKeys.returnFlag) ===
    "1";

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    if (!isReturn) return null;

    sessionStorage.removeItem(googleAuthRuntimeConfig.storageKeys.correlation);
    sessionStorage.removeItem(googleAuthRuntimeConfig.storageKeys.returnFlag);
    window.history.replaceState(null, "", "/");
    return "Unable to complete sign-in. Please try again.";
  }

  const correlation = consumeWebOAuthCorrelation(
    sessionStorage,
    googleAuthRuntimeConfig.storageKeys.correlation,
    params.get("state"),
  );
  sessionStorage.removeItem(googleAuthRuntimeConfig.storageKeys.returnFlag);
  window.history.replaceState(null, "", "/");

  if ("error" in correlation) {
    return "Unable to complete sign-in. Please try again.";
  }

  const redirectUri = getGoogleAuthRedirectUri(window.location.origin);

  try {
    await authenticateWithBackend(
      null,
      undefined,
      {},
      router,
      undefined,
      code,
      correlation.codeVerifier,
      redirectUri,
    );
    return null;
  } catch {
    return "Unable to complete sign-in. Please try again.";
  }
}

export const signOut = async (router: AppRouter) => {
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
