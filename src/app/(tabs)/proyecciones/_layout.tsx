import { Stack } from "expo-router";
import {
  addDebtHeaderRight,
  largeTitleScreenOptions,
  stackScreenOptions,
} from "@/shared/utils/routeOptions";

export default function ProyeccionesLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          ...largeTitleScreenOptions("Proyecciones"),
          headerRight: addDebtHeaderRight("Agregar deuda"),
        }}
      />
      <Stack.Screen
        name="charts"
        options={{
          title: "Gráficos",
        }}
      />
    </Stack>
  );
}
