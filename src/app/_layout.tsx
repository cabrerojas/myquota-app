import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { onSessionExpired } from "@/shared/utils/authEvents";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="login"
        options={{ headerShown: true, title: "Iniciar Sesión" }}
      />
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="(screens)" />
    </Stack>
  );
}
