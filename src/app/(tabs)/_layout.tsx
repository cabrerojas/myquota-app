import { Tabs } from "expo-router";
import { LiquidGlassTabBar } from "@/features/navigation/components/LiquidGlassTabBar";
import { UncategorizedProvider } from "@/shared/contexts/UncategorizedContext";

export default function TabLayout() {
  return (
    <UncategorizedProvider>
      <Tabs
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="transacciones" options={{ title: "Transacciones" }} />
        <Tabs.Screen name="proyecciones" options={{ title: "Proyecciones" }} />
        <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      </Tabs>
    </UncategorizedProvider>
  );
}
