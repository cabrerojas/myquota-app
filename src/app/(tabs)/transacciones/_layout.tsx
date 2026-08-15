import { Stack } from "expo-router";
import {
  addDebtHeaderRight,
  largeTitleScreenOptions,
  stackScreenOptions,
} from "@/shared/utils/routeOptions";

export default function TransaccionesLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={largeTitleScreenOptions("Transacciones")}
      />
      <Stack.Screen
        name="manualDebts"
        options={{
          title: "Compras en Cuotas",
          headerRight: addDebtHeaderRight("Agregar compra en cuotas"),
        }}
      />
    </Stack>
  );
}
