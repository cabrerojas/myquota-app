import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";
import { View, Text } from "react-native";
import { useEffect } from "react";
import {
  UncategorizedProvider,
  useUncategorized,
} from "@/shared/contexts/UncategorizedContext";

// Small helper to avoid importing Ionicons in JSX options directly
import { Ionicons } from "@expo/vector-icons";

export default function DrawerLayout() {
  return (
    <UncategorizedProvider>
      <DrawerContent />
    </UncategorizedProvider>
  );
}

function DrawerContent() {
  const { count: uncategorizedCount, refreshCount } = useUncategorized();

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerType: "front",
          headerTintColor: "#007BFF",
          headerTitleStyle: { fontWeight: "600", color: "#212529" },
          headerStyle: { backgroundColor: "#fff", elevation: 2 },
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            drawerLabel: "Inicio",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="creditCards"
          options={{
            title: "Mis Tarjetas",
            drawerLabel: "Mis Tarjetas",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="card-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="transactions"
          options={{
            title: "Transacciones",
            drawerLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontSize: 14, fontWeight: "500" }}>
                  Transacciones
                </Text>
                {uncategorizedCount > 0 && (
                  <View
                    style={{
                      backgroundColor: "#F57C00",
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginLeft: 8,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      {uncategorizedCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="receipt-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="quotas"
          options={{
            title: "Cuotas Vigentes",
            drawerLabel: "Cuotas",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="layers-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="charts"
          options={{
            title: "Gráficos",
            drawerLabel: "Gráficos",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="bar-chart-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="debtForecast"
          options={{
            title: "Proyección de Deuda",
            drawerLabel: "Proyección Deuda",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon
                name="trending-up-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="manualDebts"
          options={{
            title: "Deudas Manuales",
            drawerLabel: "Deudas Manuales",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="create-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            title: "Mi Perfil",
            drawerLabel: "Mi Perfil",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon name="person-outline" color={color} size={size} />
            ),
          }}
        />
        <Drawer.Screen
          name="notificationSettings"
          options={{
            title: "Notificaciones",
            drawerLabel: "Notificaciones",
            drawerIcon: ({ color, size }) => (
              <DrawerIcon
                name="notifications-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="billingPeriods"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Períodos de Facturación",
          }}
        />
        <Drawer.Screen
          name="billingPeriodDetail"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Detalle del Período",
          }}
        />
        <Drawer.Screen
          name="addDebt"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Deuda Manual",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

function DrawerIcon({
  name,
  color,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
