import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "@/features/auth/hooks/useAuth";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import Constants from "expo-constants";

interface UserInfo {
  givenName?: string;
  familyName?: string;
  email?: string;
  photo?: string;
}

interface CreditCardSummary {
  total: number;
  active: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [cardsSummary, setCardsSummary] = useState<CreditCardSummary>({ total: 0, active: 0 });

  useEffect(() => {
    AsyncStorage.getItem("user").then((data) => {
      if (data) setUser(JSON.parse(data));
    });

    getCreditCards()
      .then((cards) => {
        setCardsSummary({
          total: cards.length,
          active: cards.filter((c: { status: string }) => c.status === "active").length,
        });
      })
      .catch(() => {});
  }, []);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleLogout = () => {
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
  };

  const handleClearCache = () => {
    Alert.alert(
      "Limpiar caché",
      "Esto eliminará datos temporales almacenados. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          onPress: async () => {
            try {
              // Keep jwt and user, clear everything else
              const jwt = await AsyncStorage.getItem("jwt");
              const userData = await AsyncStorage.getItem("user");
              await AsyncStorage.clear();
              if (jwt) await AsyncStorage.setItem("jwt", jwt);
              if (userData) await AsyncStorage.setItem("user", userData);
              Alert.alert("Listo", "Caché limpiado correctamente");
            } catch {
              Alert.alert("Error", "No se pudo limpiar el caché");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>
          {user?.givenName} {user?.familyName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="logo-google" size={14} color="#4285F4" />
            <Text style={styles.badgeText}>Google</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="card-outline" size={22} color="#007BFF" />
          <Text style={styles.statValue}>{cardsSummary.total}</Text>
          <Text style={styles.statLabel}>Tarjetas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#28A745" />
          <Text style={styles.statValue}>{cardsSummary.active}</Text>
          <Text style={styles.statLabel}>Activas</Text>
        </View>
      </View>

      {/* Settings Section */}
      <Text style={styles.sectionTitle}>Cuenta</Text>
      <View style={styles.settingsCard}>
        <SettingsRow
          icon="mail-outline"
          label="Correo"
          value={user?.email ?? "—"}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Autenticación"
          value="Google OAuth"
        />
        <SettingsRow
          icon="key-outline"
          label="Permisos Gmail"
          value="Lectura"
          detail="Para importar transacciones"
        />
      </View>

      {/* App Section */}
      <Text style={styles.sectionTitle}>Aplicación</Text>
      <View style={styles.settingsCard}>
        <SettingsRow
          icon="information-circle-outline"
          label="Versión"
          value={appVersion}
        />
        <TouchableOpacity onPress={handleClearCache}>
          <SettingsRow
            icon="trash-outline"
            label="Limpiar caché"
            value=""
            showChevron
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL("https://github.com/gcabr/myquota-app/issues")
              .catch(() => {})
          }
        >
          <SettingsRow
            icon="bug-outline"
            label="Reportar problema"
            value=""
            showChevron
          />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <Text style={styles.sectionTitle}>Sesión</Text>
      <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#DC3545" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
        <Ionicons name="chevron-forward" size={18} color="#DC3545" />
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footerText}>MyQuota v{appVersion}</Text>
      <Text style={styles.footerSubtext}>
        Hecho con ❤️ para controlar tus gastos
      </Text>
    </ScrollView>
  );
}

// Reusable settings row
function SettingsRow({
  icon,
  label,
  value,
  detail,
  showChevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail?: string;
  showChevron?: boolean;
}) {
  return (
    <View style={settingsStyles.row}>
      <Ionicons name={icon} size={20} color="#495057" style={settingsStyles.icon} />
      <View style={settingsStyles.labelContainer}>
        <Text style={settingsStyles.label}>{label}</Text>
        {detail && <Text style={settingsStyles.detail}>{detail}</Text>}
      </View>
      {value ? (
        <Text style={settingsStyles.value}>{value}</Text>
      ) : null}
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color="#ADB5BD" />
      )}
    </View>
  );
}

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  icon: { marginRight: 12 },
  labelContainer: { flex: 1 },
  label: { fontSize: 14, fontWeight: "500", color: "#212529" },
  detail: { fontSize: 11, color: "#868E96", marginTop: 2 },
  value: { fontSize: 13, color: "#868E96", marginRight: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { paddingBottom: 40 },

  // Profile header
  profileHeader: {
    backgroundColor: "#007BFF",
    paddingTop: 30,
    paddingBottom: 28,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    marginTop: -14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#212529",
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: "#868E96",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    overflow: "hidden",
  },

  // Logout
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    padding: 16,
    gap: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC3545",
    flex: 1,
  },

  // Footer
  footerText: {
    textAlign: "center",
    fontSize: 13,
    color: "#ADB5BD",
    marginTop: 30,
  },
  footerSubtext: {
    textAlign: "center",
    fontSize: 12,
    color: "#CED4DA",
    marginTop: 4,
  },
});
