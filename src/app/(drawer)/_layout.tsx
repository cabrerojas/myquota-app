import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";
import { useEffect, useRef } from "react";
import { Platform, View, Text } from "react-native";
import { useNavigation } from "expo-router";
import {
  UncategorizedProvider,
  useUncategorized,
} from "@/shared/contexts/UncategorizedContext";
import { colors } from "@/shared/theme/colors";
import DashboardScreen from "@/features/dashboard/screens/DashboardScreen";

export default function DrawerLayout() {
  // TEMP: prove rendering works on web
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>myQuota Web</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, textAlign: "center" }}>
          La app está renderizando correctamente.{"\n"}
          Platform.OS = "{Platform.OS}"
        </Text>
      </View>
    );
  }

  return (
    <UncategorizedProvider>
      <DrawerContent />
    </UncategorizedProvider>
  );
}

function DrawerContent() {
  const { refreshCount } = useUncategorized();
  const navigation = useNavigation();
  const hasOpened = useRef(false);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (Platform.OS === "web" && !hasOpened.current) {
      hasOpened.current = true;
      setTimeout(() => {
        (navigation as any).openDrawer?.();
      }, 300);
    }
  }, [navigation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerType: "front",
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
