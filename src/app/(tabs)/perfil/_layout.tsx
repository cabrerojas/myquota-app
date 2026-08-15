import { Stack } from "expo-router";
import {
  largeTitleScreenOptions,
  stackScreenOptions,
} from "@/shared/utils/routeOptions";

export default function PerfilLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={largeTitleScreenOptions("Perfil")} />
      <Stack.Screen
        name="notificationSettings"
        options={{
          title: "Notificaciones",
        }}
      />
    </Stack>
  );
}
