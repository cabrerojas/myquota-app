import { Stack, router } from "expo-router";
import { Pressable, Platform, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";

const BackButton = () => (
  <Pressable
    onPress={() => router.back()}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      marginLeft: Platform.OS === "ios" ? -8 : 0,
      opacity: pressed ? 0.5 : 1,
    })}
    hitSlop={8}
  >
    <Ionicons name="chevron-back" size={Platform.OS === "ios" ? 20 : 24} color={colors.accent} style={{ marginRight: Platform.OS === "ios" ? -3 : 0 }} />
    {Platform.OS === "ios" && <Text style={{ color: colors.accent, fontSize: 17, fontWeight: "400" }}>Volver</Text>}
  </Pressable>
);

export default function TransaccionesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: "600", color: colors.textPrimary },
        headerStyle: {
          backgroundColor: Platform.OS === "ios" ? "rgba(15, 23, 42, 0.85)" : colors.bg,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Transacciones",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="manualDebts"
        options={{
          title: "Compras en Cuotas",
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(screens)/addDebt" as any)}
              hitSlop={8}
              accessibilityLabel="Agregar compra en cuotas"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
