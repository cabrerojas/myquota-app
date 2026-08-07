import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: { backgroundColor: colors.bg },
        headerLeft: navigation.canGoBack()
          ? undefined // default iOS back arrow for inner-stack screens
          : () => (
              <Pressable
                onPress={() => router.back()}
                style={{ paddingRight: 12 }}
                hitSlop={8}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={colors.accent}
                />
              </Pressable>
            ),
      })}
    />
  );
}
