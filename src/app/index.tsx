import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/features/auth/services/sessionStorage";

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
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
