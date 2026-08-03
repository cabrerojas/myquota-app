import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useNavigation } from "expo-router";
import {
  UncategorizedProvider,
  useUncategorized,
} from "@/shared/contexts/UncategorizedContext";
import { colors } from "@/shared/theme/colors";
import { WebSidebar } from "@/shared/components/WebSidebar";
import DashboardScreen from "@/features/dashboard/screens/DashboardScreen";

export default function DrawerLayout() {
  if (Platform.OS === "web") {
    return <WebDashboardLayout />;
  }

  return (
    <UncategorizedProvider>
      <DrawerContent />
    </UncategorizedProvider>
  );
}

// ── Web layout: sidebar + content ─────────────────────────────────────────

function WebDashboardLayout() {
  const [screen, setScreen] = useState<"dashboard" | "creditCards" | "transactions" | "charts" | "debtForecast" | "manualDebts" | "profile">("dashboard");

  const renderScreen = () => {
    switch (screen) {
      case "dashboard": return <DashboardScreen key="dashboard" />;
      default: return <PlaceholderScreen name={screen} />;
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg }}>
      <WebSidebar active={screen} onSelect={setScreen} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {renderScreen()}
      </View>
    </View>
  );
}

function PlaceholderScreen({ name }: { name: string }) {
  const labels: Record<string, string> = {
    creditCards: "Mis Tarjetas",
    transactions: "Transacciones",
    charts: "Gráficos",
    debtForecast: "Proyección de Deuda",
    manualDebts: "Deudas Manuales",
    profile: "Mi Perfil",
  };
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
      <View style={{ color: colors.textMuted, fontSize: 16 } as any}>{labels[name] ?? name}</View>
    </View>
  );
}

// ── Native drawer (unchanged) ──────────────────────────────────────────────

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
