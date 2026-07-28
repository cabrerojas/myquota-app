import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { signOut } from "@/features/auth/hooks/useAuth";
import { UserInfo } from "@/shared/types/user";
import { getSessionUser } from "@/features/auth/services/sessionStorage";
import { colors } from "@/shared/theme/colors";

export default function CustomDrawerContent(
  props: DrawerContentComponentProps,
) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    getSessionUser().then((data) => {
      if (data) setUser(data);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Header del usuario con glass effect */}
      <View style={styles.userSection}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={28} color={colors.textPrimary} />
          </View>
        )}
        <Text style={styles.userName}>
          {user?.givenName} {user?.familyName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Items del drawer */}
      <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer: Cerrar sesión */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              "Cerrar sesión",
              "¿Estás seguro de que deseas cerrar sesión?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Cerrar sesión",
                  style: "destructive",
                  onPress: () => signOut(router),
                },
              ],
            );
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  userSection: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutText: {
    fontSize: 14,
    color: colors.destructive,
    fontWeight: "500",
  },
});
