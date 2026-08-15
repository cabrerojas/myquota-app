import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { addDebtRoute } from "@/shared/utils/routes";

export const stackScreenOptions = {
  headerTintColor: colors.accent,
  headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
  headerStyle: { backgroundColor: colors.bg },
};

export const modalStackScreenOptions = {
  ...stackScreenOptions,
  presentation: "modal" as const,
  headerBlurEffect: "systemChromeMaterialDark" as const,
};

export const largeTitleScreenOptions = (title: string, fontSize?: number) => ({
  title,
  headerLargeTitleEnabled: true,
  headerLargeStyle: { backgroundColor: colors.bg },
  headerLargeTitleStyle: {
    color: colors.textPrimary,
    ...(fontSize ? { fontSize } : {}),
    fontWeight: "700" as const,
  },
  headerLargeTitleShadowVisible: false,
});

export const addDebtHeaderRight = (accessibilityLabel: string) => {
  function AddDebtHeaderAction() {
    return (
      <View style={styles.headerActionContainer}>
        <Pressable
          onPress={() => router.push(addDebtRoute)}
          hitSlop={8}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
        </Pressable>
      </View>
    );
  }

  return AddDebtHeaderAction;
};

const styles = StyleSheet.create({
  headerActionContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
