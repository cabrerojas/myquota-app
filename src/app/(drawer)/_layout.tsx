import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";
import { useEffect, useRef, useState } from "react";
import { Platform, View, Text, Pressable } from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  UncategorizedProvider,
  useUncategorized,
} from "@/shared/contexts/UncategorizedContext";
import { colors } from "@/shared/theme/colors";
import DashboardScreen from "@/features/dashboard/screens/DashboardScreen";

export default function DrawerLayout() {
  if (Platform.OS === "web") {
    return (
      <UncategorizedProvider>
        <WebLayout />
      </UncategorizedProvider>
    );
  }

  return (
    <UncategorizedProvider>
      <DrawerContent />
    </UncategorizedProvider>
  );
}

// ── Web layout: app-style sidebar + content with header ───────────────────

type WebScreen = "dashboard" | "creditCards" | "transactions" | "charts" | "debtForecast" | "manualDebts" | "profile";

function WebLayout() {
  const [screen, setScreen] = useState<WebScreen>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const labels: Record<WebScreen, string> = {
    dashboard: "Inicio",
    creditCards: "Mis Tarjetas",
    transactions: "Transacciones",
    charts: "Gráficos",
    debtForecast: "Proyección de Deuda",
    manualDebts: "Deudas Manuales",
    profile: "Mi Perfil",
  };

  const renderScreen = () => {
    switch (screen) {
      case "dashboard": return <DashboardScreen />;
      default: return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>{labels[screen]}</Text>
          <Text style={{ color: colors.textSubtle, fontSize: 13, marginTop: 8 }}>Próximamente en web</Text>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg }}>
      {/* Sidebar — same design as native drawer */}
      {sidebarOpen && (
        <View style={{ width: 280, borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.06)" }}>
          <CustomDrawerContent
            state={{ routes: [], index: 0, history: [], routeNames: [], stale: false, type: "drawer", key: "web" } as any}
            navigation={{ navigate: ((s: string) => { if (labels[s as WebScreen]) setScreen(s as WebScreen); }) as any } as any}
            descriptors={{}}
          />
        </View>
      )}

      {/* Content area */}
      <View style={{ flex: 1 }}>
        {/* Header bar — same style as native */}
        <View style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          backgroundColor: colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}>
          <Pressable
            onPress={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: 8, borderRadius: 8, marginRight: 8 }}
          >
            <Ionicons name="menu" size={22} color={colors.accent} />
          </Pressable>
          <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "600" }}>
            {labels[screen]}
          </Text>
        </View>

        {/* Screen content */}
        <View style={{ flex: 1 }}>
          {renderScreen()}
        </View>
      </View>
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
