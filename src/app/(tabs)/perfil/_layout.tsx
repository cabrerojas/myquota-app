import { Stack } from "expo-router";
import { colors } from "@/shared/theme/colors";

export default function PerfilLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Perfil",
          headerLargeTitle: true,
          headerLargeStyle: { backgroundColor: colors.bg },
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="notificationSettings"
        options={{
          title: "Notificaciones",
        }}
      />
    </Stack>
  );
}
