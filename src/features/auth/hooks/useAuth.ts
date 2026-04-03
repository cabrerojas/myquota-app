import { useState, useCallback } from "react";
import {
  emitSessionExpired,
  isSessionExpired,
  resetSessionExpired,
} from "@/shared/utils/authEvents";

import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { Router } from "expo-router";
import { API_BASE_URL } from "@/config/api";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  persistSession,
} from "@/features/auth/services/sessionStorage";

const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;

GoogleSignin.configure({
  webClientId: webClientId,
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  offlineAccess: true, // Necesario para obtener serverAuthCode (refresh_token en el backend)
  forceCodeForRefreshToken: true,
  iosClientId: iosClientId,
});

export const useGoogleSignIn = (router: Router) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
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
        console.log("Usuario obtenido:", user);
        console.log(
          "serverAuthCode obtenido:",
          serverAuthCode ? "✅" : "❌ no disponible",
        );

        // 🔹 Enviar el idToken y serverAuthCode al backend
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const res = await fetch(`${API_BASE_URL}/login/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: idToken, serverAuthCode }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await res.json();
        // backend ahora devuelve { accessToken, refreshToken }
        if (data.accessToken) {
          console.log("Access token recibido");
          resetSessionExpired();
          try {
            const normalizedUser = {
              givenName: user.givenName ?? undefined,
              familyName: user.familyName ?? undefined,
              email: user.email ?? undefined,
              photo: user.photo ?? undefined,
            };
            await persistSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: normalizedUser,
            });
          } catch (err) {
            console.warn("Session storage error saving tokens:", err);
          }

          // 🔹 Redirigir al Dashboard
          router.replace("/(drawer)/dashboard");
        } else {
          console.error("Error al autenticar con el backend:", data);
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

    await GoogleSignin.signOut();
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

export async function requestWithAuth(input: RequestInfo, init?: RequestInit) {
  // Si la sesión ya expiró, no hacer la request
  if (isSessionExpired()) {
    return new Response(JSON.stringify({ message: "Sesión expirada" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = {
    ...((init?.headers as Record<string, string>) || {}),
    ...(await getAuthHeaders()),
  };
  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    // intentar refresh una vez
    try {
      await attemptRefresh();
      const headers2 = {
        ...((init?.headers as Record<string, string>) || {}),
        ...(await getAuthHeaders()),
      };
      res = await fetch(input, { ...init, headers: headers2 });
    } catch {
      // si falla refresh, limpiar sesión y redirigir a login
      await clearSession();
      emitSessionExpired();
      // No throw — el usuario ya fue redirigido a login.
      // Retornar la respuesta 401 original para que el caller
      // no muestre errores técnicos al usuario.
    }
  }

  return res;
}
