import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../features/auth/hooks/useAuth";
import { useRouter } from "expo-router";

export default function RootLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Iniciar Sesión" }} />
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => signOut(router)}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="log-out-outline" size={24} color="red" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
