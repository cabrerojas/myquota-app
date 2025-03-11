import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("jwt").then((token) => {
      setIsAuthenticated(!!token);
    });
  }, []);

  if (isAuthenticated === null) return null; // Evita parpadeo al cargar

  return isAuthenticated ? (
    <Redirect href="/dashboard" />
  ) : (
    <Redirect href="/login" />
  );
}
