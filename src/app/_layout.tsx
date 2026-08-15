import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DarkTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { onSessionExpired } from "@/shared/utils/authEvents";
import { SessionExpiredError } from "@/features/auth/hooks/useAuth";
import { ThemeProvider } from "@/shared/theme/ThemeContext";
import { UncategorizedProvider } from "@/shared/contexts/UncategorizedContext";

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

// Custom dark theme override: white-flash mitigation for NativeTabs (PR 2).
// Must wrap (tabs) and (screens) groups — @react-navigation ThemeProvider
// is the documented fix for transparent tab-bar flash during stack push.
const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0F172A",
  },
};

// Expo Go guard — NativeTabs requires a development build.
// Early check so Expo Go users see a clear message instead of a cryptic crash.
function isExpoGo(): boolean {
  try {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      queryClient.clear(); // Clear all cached query data
      router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="light" />
          {isExpoGo() ? (
            <View style={expoGoStyles.container}>
              <Text style={expoGoStyles.title}>Development Build Required</Text>
              <Text style={expoGoStyles.message}>
                MyQuota uses native tab navigation that requires a development
                build. Expo Go does not support this feature.
              </Text>
              <Text style={expoGoStyles.command}>
                npx expo run:ios
              </Text>
              <Text style={expoGoStyles.command}>
                npx expo run:android
              </Text>
            </View>
          ) : (
            <NavigationThemeProvider value={MyDarkTheme}>
              <UncategorizedProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen
                    name="login"
                    options={{ headerShown: false, animation: "fade" }}
                  />
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(screens)" />
                </Stack>
              </UncategorizedProvider>
            </NavigationThemeProvider>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const expoGoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  command: {
    color: "#3B82F6",
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 8,
  },
});
