import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const token = (await SecureStore.getItemAsync("accessToken")) || (await AsyncStorage.getItem("jwt"));
      setIsAuthenticated(!!token);
    })();
  }, []);

  if (isAuthenticated === null) return null; // Evita parpadeo al cargar

  return isAuthenticated ? (
    <Redirect href="/(drawer)/dashboard" />
  ) : (
    <Redirect href="/login" />
  );
}
