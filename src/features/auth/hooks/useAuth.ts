import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback } from "react";

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
        if (data.token) {
          console.log("JWT recibido:", data.token);
          await AsyncStorage.setItem("jwt", data.token);
          await AsyncStorage.setItem("user", JSON.stringify(user));

          // 🔹 Redirigir al Dashboard
          router.replace("/dashboard");
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
    await GoogleSignin.signOut(); // Cerrar sesión en Google
    await AsyncStorage.multiRemove(["jwt", "user"]); // Eliminar datos de sesión

    console.log("Sesión cerrada.");

    // 🔹 Redirigir al login
    router.replace("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    // Aunque falle Google signOut, limpiamos sesión local y redirigimos
    await AsyncStorage.multiRemove(["jwt", "user"]);
    router.replace("/login");
  }
};

export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("jwt");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};
