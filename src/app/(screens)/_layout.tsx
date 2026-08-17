import { Stack } from "expo-router";
import { modalStackScreenOptions } from "@/shared/utils/routeOptions";

export default function ScreensLayout() {
  return (
    <Stack screenOptions={modalStackScreenOptions}>
      <Stack.Screen
        name="addDebt"
        options={{
          title: "Deuda Manual",
        }}
      />
      <Stack.Screen
        name="billingPeriods"
        options={{
          title: "Períodos de Facturación",
        }}
      />
      <Stack.Screen
        name="billingPeriodDetail"
        options={{
          title: "Detalle del Período",
        }}
      />
      <Stack.Screen
        name="transactionDetail"
        options={{
          title: "Detalle de Transacción",
        }}
      />
      <Stack.Screen
        name="refundEntry"
        options={{
          title: "Registrar reembolso",
          presentation: "formSheet",
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
        }}
      />
    </Stack>
  );
}
