import { Stack, router } from "expo-router";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";

export default function TransaccionesLayout() {
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
          title: "Transacciones",
          headerLargeTitle: true,
          headerLargeStyle: { backgroundColor: colors.bg },
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="manualDebts"
        options={{
          title: "Compras en Cuotas",
          headerRight: () => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Pressable
                onPress={() => router.push("/(screens)/addDebt" as any)}
                hitSlop={8}
                accessibilityLabel="Agregar compra en cuotas"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
              </Pressable>
            </View>
          ),
        }}
      />
    </Stack>
  );
}
