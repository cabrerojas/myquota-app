import { Stack } from "expo-router";
import {
  largeTitleScreenOptions,
  stackScreenOptions,
} from "@/shared/utils/routeOptions";

export default function InicioLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={largeTitleScreenOptions("Inicio", 34)}
      />
      <Stack.Screen
        name="creditCards"
        options={{
          title: "Mis Tarjetas",
        }}
      />
    </Stack>
  );
}
