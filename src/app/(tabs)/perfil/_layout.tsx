import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/shared/theme/colors";

export default function PerfilLayout() {
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Perfil",
          headerLargeTitle: true,
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
