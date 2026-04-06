import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onSessionExpired } from "@/shared/utils/authEvents";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (300 seconds)
      staleTime: 5 * 60 * 1000,
      // Don't refetch on window focus (reduces unnecessary requests)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (reduces requests when coming back from background)
      refetchOnReconnect: false,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="login"
          options={{ headerShown: true, title: "Iniciar Sesión" }}
        />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(screens)" />
      </Stack>
    </QueryClientProvider>
  );
}
