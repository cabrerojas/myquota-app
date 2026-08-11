import { Stack, router } from "expo-router";
import { Pressable, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";

export default function ProyeccionesLayout() {
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
          title: "Proyecciones",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerRight: () => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Pressable
                onPress={() => router.push("/(screens)/addDebt" as any)}
                hitSlop={8}
                accessibilityLabel="Agregar deuda"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="charts"
        options={{
          title: "Gráficos",
        }}
      />
    </Stack>
  );
}
