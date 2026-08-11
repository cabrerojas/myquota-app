import { Stack } from "expo-router";
import { colors } from "@/shared/theme/colors";

export default function InicioLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.bg },
        // Native back arrow + swipe-back — zero custom BackButton.
        // Native large-title collapse on scroll — system handles it.
        // Reduce Transparency / Reduce Motion — system handles both.
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Inicio",
          headerLargeTitleEnabled: true,
          headerLargeStyle: { backgroundColor: colors.bg },
          headerLargeTitleStyle: {
            color: colors.textPrimary,
            fontWeight: "700",
          },
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
