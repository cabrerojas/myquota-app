import { Stack } from "expo-router";
import { colors } from "@/shared/theme/colors";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
