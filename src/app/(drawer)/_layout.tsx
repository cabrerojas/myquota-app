import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";
import { useEffect } from "react";
import { Platform } from "react-native";
import {
  UncategorizedProvider,
  useUncategorized,
} from "@/shared/contexts/UncategorizedContext";
import { colors } from "@/shared/theme/colors";

export default function DrawerLayout() {
  return (
    <UncategorizedProvider>
      <DrawerContent />
    </UncategorizedProvider>
  );
}

function DrawerContent() {
  const { refreshCount } = useUncategorized();

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerType: Platform.OS === "web" ? "permanent" : "front",
          headerTintColor: colors.accent,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 17,
            color: colors.textPrimary,
          },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          drawerStyle: { backgroundColor: colors.bg },
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: "Inicio" }} />
        <Drawer.Screen name="creditCards" options={{ title: "Mis Tarjetas" }} />
        <Drawer.Screen name="transactions" options={{ title: "Transacciones" }} />
        <Drawer.Screen
          name="quotas"
          options={{ title: "Cuotas Vigentes", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen name="charts" options={{ title: "Gráficos" }} />
        <Drawer.Screen
          name="debtForecast"
          options={{ title: "Proyección de Deuda" }}
        />
        <Drawer.Screen name="manualDebts" options={{ title: "Deudas Manuales" }} />
        <Drawer.Screen name="profile" options={{ title: "Mi Perfil" }} />
        <Drawer.Screen
          name="notificationSettings"
          options={{ title: "Notificaciones" }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
