import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
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
            await SecureStore.setItemAsync("accessToken", data.accessToken);
            if (data.refreshToken)
              await SecureStore.setItemAsync("refreshToken", data.refreshToken);
            // debug: confirm tokens saved
            try {
              const savedRt = await SecureStore.getItemAsync("refreshToken");
              console.log("Saved refreshToken present:", !!savedRt);
            } catch (e) {
              console.warn("SecureStore getItemAsync debug error:", e);
            }
          } catch (err) {
            console.warn("SecureStore error saving tokens:", err);
          }

          // mantener compatibilidad: guardar jwt en AsyncStorage (legacy)
          await AsyncStorage.setItem("jwt", data.accessToken);
          await AsyncStorage.setItem("user", JSON.stringify(user));

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
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
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
    await AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]);
    try {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
    } catch (err) {
      console.warn("SecureStore error deleting tokens:", err);
    }

    router.replace("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    await AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]);
    router.replace("/login");
  }
};

export const getAuthHeaders = async () => {
  // Preferir SecureStore (accessToken), fallback a legacy 'jwt' en AsyncStorage
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync("accessToken");
  } catch (err) {
    console.warn("SecureStore getItemAsync error:", err);
  }
  if (!token) token = await AsyncStorage.getItem("jwt");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function attemptRefresh() {
  let refreshToken: string | null = null;
  try {
    refreshToken = await SecureStore.getItemAsync("refreshToken");
  } catch (err) {
    console.warn("SecureStore getItemAsync error:", err);
  }
  if (!refreshToken) {
    // limpiar sesión local si no hay refresh token para forzar login
    try {
      await AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]);
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
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
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      if (data.refreshToken)
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
    } catch (err) {
      console.warn("SecureStore setItemAsync error:", err);
    }
    await AsyncStorage.setItem("jwt", data.accessToken); // legacy
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
      // si falla refresh, limpiar sesión y redirigir a login
      await AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]);
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      emitSessionExpired();
      // No throw — el usuario ya fue redirigido a login.
      // Retornar la respuesta 401 original para que el caller
      // no muestre errores técnicos al usuario.
    }
  }

  return res;
}
