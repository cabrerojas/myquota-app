import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onSessionExpired } from "@/shared/utils/authEvents";
import { SessionExpiredError } from "@/features/auth/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        if (error instanceof SessionExpiredError) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof SessionExpiredError) return false;
        return failureCount < 1;
      },
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
