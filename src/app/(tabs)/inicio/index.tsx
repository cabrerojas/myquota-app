import { Stack } from "expo-router";
import DashboardScreen from "@/features/dashboard/screens/DashboardScreen";
import { colors } from "@/shared/theme/colors";

export default function Dashboard() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Inicio",
          headerLargeTitleEnabled: true,
          headerLargeStyle: { backgroundColor: colors.bg },
          headerLargeTitleStyle: {
            color: colors.textPrimary,
            fontSize: 34,
            fontWeight: "700",
          },
          headerLargeTitleShadowVisible: false,
        }}
      />
      <DashboardScreen />
    </>
  );
}
