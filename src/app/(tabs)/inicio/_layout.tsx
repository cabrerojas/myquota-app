import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/shared/theme/tokens";

export default function InicioLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: styles.headerTitle,
        headerStyle: styles.header,
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
          headerLargeStyle: styles.header,
          headerLargeTitleStyle: styles.headerLargeTitle,
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

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.bg,
  },
  headerTitle: {
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerLargeTitle: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "700",
  },
});
