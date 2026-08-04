import {
  View, Text, StyleSheet, Image, Pressable, ScrollView, Alert,
  Linking, TextInput, ActivityIndicator, RefreshControl,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "@/features/auth/hooks/useAuth";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { useMyProfile } from "@/features/profile/services/userApi";
import { updateMyProfile } from "@/features/profile/services/userApi";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { UserInfo, User } from "@/shared/types/user";
import { CreditCardSummary } from "@/shared/types/creditCard";
import { isSessionExpired } from "@/shared/utils/authEvents";
import { getSessionUser } from "@/features/auth/services/sessionStorage";
import { colors } from "@/shared/theme/colors";
import { glassSurface } from "@/shared/theme/effects";

function SettingsRow({ icon, label, value, detail, showChevron, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; value: string; detail?: string; showChevron?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [sRowStyles.row, pressed && onPress && sRowStyles.rowPressed]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={sRowStyles.icon} />
      <View style={sRowStyles.labelContainer}>
        <Text style={sRowStyles.label}>{label}</Text>
        {detail ? <Text style={sRowStyles.detail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={sRowStyles.value}>{value}</Text> : null}
      {showChevron && <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />}
    </Pressable>
  );
}

const sRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowPressed: { backgroundColor: "rgba(255,255,255,0.03)" },
  icon: { marginRight: 12 },
  labelContainer: { flex: 1 },
  label: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  detail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  value: { fontSize: 13, color: colors.textMuted, marginRight: 4 },
});

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isFetching, refetch } = useMyProfile();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [cardsSummary, setCardsSummary] = useState<CreditCardSummary>({ total: 0, active: 0 });
  const [budgetCLP, setBudgetCLP] = useState("");
  const [budgetUSD, setBudgetUSD] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  useEffect(() => {
    getSessionUser().then((data) => { if (data) setUser(data); });
    getCreditCards().then((r) => {
      const cards = r.items;
      setCardsSummary({ total: cards.length, active: cards.filter((c) => c.status === "active").length });
    }).catch(() => {});
  }, []);

  const handleSaveBudget = async () => {
    setIsSavingBudget(true);
    try {
      const clp = budgetCLP ? parseInt(budgetCLP.replace(/[^0-9]/g, ""), 10) : undefined;
      const usd = budgetUSD ? parseFloat(budgetUSD.replace(/[^0-9.]/g, "")) : undefined;
      await updateMyProfile({ monthlyBudgetCLP: clp, monthlyBudgetUSD: usd });
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      Alert.alert("Guardado", "Presupuestos actualizados");
    } catch (e) {
      if (!isSessionExpired()) Alert.alert("Error", e instanceof Error ? e.message : "No se pudieron guardar");
    } finally { setIsSavingBudget(false); }
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => signOut(router) },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert("Limpiar caché", "¿Eliminar datos temporales?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpiar", onPress: async () => {
          try {
            const userData = await AsyncStorage.getItem("user");
            await AsyncStorage.clear();
            if (userData) await AsyncStorage.setItem("user", userData);
            Alert.alert("Listo", "Caché limpiado");
          } catch { Alert.alert("Error", "No se pudo limpiar"); }
      }},
    ]);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={refetch}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={s.profileHeader}>
        <View style={s.avatarContainer}>
          {user?.photo ? <Image source={{ uri: user.photo }} style={s.avatar} /> :
            <View style={s.avatarPlaceholder}><Ionicons name="person" size={36} color={colors.textPrimary} /></View>}
        </View>
        <Text style={s.userName}>{user?.givenName} {user?.familyName}</Text>
        <Text style={s.userEmail}>{user?.email}</Text>
        <View style={s.badge}><Ionicons name="logo-google" size={13} color={colors.accent} />
          <Text style={s.badgeText}>Google</Text></View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, styles.glassCard]}>
          <Ionicons name="card-outline" size={20} color={colors.accent} />
          <Text style={s.statValue}>{cardsSummary.total}</Text>
          <Text style={s.statLabel}>Tarjetas</Text>
        </View>
        <View style={[s.statCard, styles.glassCard]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <Text style={s.statValue}>{cardsSummary.active}</Text>
          <Text style={s.statLabel}>Activas</Text>
        </View>
      </View>

      {/* Budget */}
      <Text style={styles.sectionTitle}>Presupuestos Mensuales</Text>
      <View style={[styles.card, { padding: 16 }]}>
        {isLoading ? <ActivityIndicator size="small" color={colors.accent} /> : <>
          <View style={s.budgetRow}>
            <View style={s.budgetLabel}>
              <Ionicons name="cash-outline" size={18} color={colors.success} />
              <Text style={s.budgetLabelText}>Presupuesto CLP</Text>
            </View>
            <TextInput style={s.budgetInput} placeholder="Ej: 2500000" placeholderTextColor={colors.textSubtle}
              keyboardType="numeric" value={budgetCLP} onChangeText={setBudgetCLP} />
          </View>
          <View style={s.budgetDivider} />
          <View style={s.budgetRow}>
            <View style={s.budgetLabel}>
              <Ionicons name="cash-outline" size={18} color={colors.accent} />
              <Text style={s.budgetLabelText}>Presupuesto USD</Text>
            </View>
            <TextInput style={s.budgetInput} placeholder="Ej: 1000" placeholderTextColor={colors.textSubtle}
              keyboardType="numeric" value={budgetUSD} onChangeText={setBudgetUSD} />
          </View>
          <Pressable onPress={handleSaveBudget} disabled={isSavingBudget}
            style={({ pressed }) => [s.saveButton, isSavingBudget && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}>
            {isSavingBudget ? <ActivityIndicator size="small" color={colors.textPrimary} /> :
              <Text style={s.saveButtonText}>Guardar presupuestos</Text>}
          </Pressable>
        </>}
      </View>

      {/* Account */}
      <Text style={styles.sectionTitle}>Cuenta</Text>
      <View style={styles.card}>
        <SettingsRow icon="mail-outline" label="Correo" value={user?.email ?? "—"} />
        <SettingsRow icon="shield-checkmark-outline" label="Autenticación" value="Google OAuth" />
        <SettingsRow icon="key-outline" label="Permisos Gmail" value="Lectura" detail="Para importar transacciones" />
      </View>

      {/* App */}
      <Text style={styles.sectionTitle}>Aplicación</Text>
      <View style={styles.card}>
        <SettingsRow icon="information-circle-outline" label="Versión" value={appVersion} />
        <SettingsRow icon="trash-outline" label="Limpiar caché" value="" showChevron onPress={handleClearCache} />
        <SettingsRow icon="bug-outline" label="Reportar problema" value="" showChevron
          onPress={() => Linking.openURL("https://github.com/gcabr/myquota-app/issues").catch(() => {})} />
      </View>

      {/* Logout */}
      <Text style={styles.sectionTitle}>Sesión</Text>
      <Pressable onPress={handleLogout} style={({ pressed }) => [s.logoutCard, pressed && { opacity: 0.7 }]}>
        <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Cerrar sesión</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
      </Pressable>

      <Text style={s.footer}>MyQuota v{appVersion}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  glassCard: { ...glassSurface(false), padding: 16, alignItems: "center" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 22, marginBottom: 8 },
  card: { ...glassSurface(false), marginHorizontal: 16, overflow: "hidden" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  profileHeader: {
    backgroundColor: colors.surfaceElevated, paddingTop: 40, paddingBottom: 24,
    alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: colors.accent },
  avatarPlaceholder: { width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(59,130,246,0.15)", justifyContent: "center", alignItems: "center" },
  userName: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10,
    backgroundColor: "rgba(59,130,246,0.1)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14 },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.accent },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: -12 },
  statCard: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 3,
    textTransform: "uppercase", letterSpacing: 0.5 },
  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  budgetLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  budgetLabelText: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  budgetInput: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 14, fontWeight: "600", color: colors.textPrimary, minWidth: 120, textAlign: "right",
    borderWidth: 1, borderColor: colors.border },
  budgetDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 8 },
  saveButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12,
    alignItems: "center", marginTop: 14 },
  saveButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  logoutCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", padding: 14, gap: 10,
    backgroundColor: "rgba(220,38,38,0.04)" },
  logoutText: { fontSize: 15, fontWeight: "600", color: colors.destructive, flex: 1 },
  footer: { textAlign: "center", fontSize: 12, color: colors.textSubtle, marginTop: 30 },
});
