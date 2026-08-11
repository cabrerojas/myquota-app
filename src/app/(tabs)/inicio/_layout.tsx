import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/shared/theme/colors";

export default function InicioLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerTransparent: Platform.OS === "ios",
        headerBlurEffect: Platform.OS === "ios" ? "systemChromeMaterialDark" : undefined,
        headerStyle: {
          backgroundColor: Platform.OS === "android" ? colors.bg : undefined,
        },
        // Native back arrow + swipe-back — zero custom BackButton.
        // Native large-title collapse on scroll — system handles it.
        // Reduce Transparency / Reduce Motion — system handles both.
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Inicio",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="creditCards"
        options={{
          title: "Mis Tarjetas",
        }}
      />
    </Stack>
  );
}
