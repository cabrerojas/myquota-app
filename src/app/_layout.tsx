import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="login"
        options={{ headerShown: true, title: "Iniciar Sesión" }}
      />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}
