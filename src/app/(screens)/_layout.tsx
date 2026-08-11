import { Stack } from "expo-router";
import { colors } from "@/shared/theme/colors";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerBlurEffect: "systemChromeMaterialDark",
        headerStyle: { backgroundColor: colors.bg },
        // Native dismiss gesture + back — zero custom headerLeft.
        // Reduce Transparency / Reduce Motion — system handles both.
      }}
    />
  );
}
