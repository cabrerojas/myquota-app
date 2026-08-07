import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.bg },
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              paddingRight: 12,
              opacity: pressed ? 0.6 : 1,
            })}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.accent}
            />
          </Pressable>
        ),
      }}
    />
  );
}
