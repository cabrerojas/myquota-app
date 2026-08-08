import { Tabs } from "expo-router";
import { LiquidGlassTabBar } from "@/features/navigation/components/LiquidGlassTabBar";
import { UncategorizedProvider } from "@/shared/contexts/UncategorizedContext";

export default function TabsLayout() {
  return (
    <UncategorizedProvider>
      <Tabs
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: "Inicio" }}
        />
        <Tabs.Screen
          name="transactions"
          options={{ title: "Transacciones" }}
        />
        <Tabs.Screen
          name="debtForecast"
          options={{ title: "Proyecciones" }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Perfil" }}
        />

        {/* Hidden screens — reachable via navigation.navigate() */}
        <Tabs.Screen name="creditCards" options={{ href: null }} />
        <Tabs.Screen name="quotas" options={{ href: null }} />
        <Tabs.Screen name="charts" options={{ href: null }} />
        <Tabs.Screen name="manualDebts" options={{ href: null }} />
        <Tabs.Screen name="notificationSettings" options={{ href: null }} />
      </Tabs>
    </UncategorizedProvider>
  );
}
