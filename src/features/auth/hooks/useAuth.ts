import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { Router, useRouter } from "expo-router";

const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;

GoogleSignin.configure({
  webClientId: webClientId, // client ID of type WEB for your server (needed to verify user ID and offline access),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
  offlineAccess: false, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  iosClientId: iosClientId, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

export const signIn = async (router: Router) => {
  try {
    console.log("Iniciando sesión con Google...");
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse(response)) {
      const idToken = response.data.idToken;

      if (!idToken) {
        console.error("Error: No se obtuvo el idToken de Google.");
        return;
      }

      console.log("idToken obtenido:", idToken);

      // 🔹 Enviar el idToken al backend
      const res = await fetch(
        "https://myquota-backend-production.up.railway.app/api/login/google",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: idToken }),
        },
      );

      const data = await res.json();
      if (data.token) {
        console.log("JWT recibido:", data.token);
        await AsyncStorage.setItem("jwt", data.token);

        // 🔹 Redirigir al Dashboard usando el router pasado desde el componente
        router.replace("/dashboard");
      } else {
        console.error("Error al autenticar con el backend:", data);
      }
    }
  } catch (error) {
    console.error("Error en Google Sign-In:", error);
  }
};

export const signOut = async (router: Router) => {
  try {
    await GoogleSignin.signOut(); // Cerrar sesión en Google
    await AsyncStorage.removeItem("jwt"); // Eliminar el token de sesión

    console.log("Sesión cerrada.");

    // 🔹 Redirigir al login
    router.replace("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};
