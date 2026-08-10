import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  NotificationSettings, getNotificationSettings, saveNotificationSettings,
  requestNotificationPermissions, scheduleCardNotifications,
  cancelAllScheduledNotifications, getScheduledNotifications, CreditCardForNotification,
} from "@/features/notifications/services/notificationService";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import ErrorState from "@/shared/components/ErrorState";
import { colors } from "@/shared/theme/colors";
import { borderRadius, TAB_BAR_SPACER_HEIGHT } from "@/shared/theme/tokens";
import { glassSurface } from "@/shared/theme/effects";

const DAYS_OPTIONS = [1, 2, 3, 5];
const HOUR_OPTIONS = [7, 8, 9, 10, 12, 18, 20];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = async (isRefresh?: boolean) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const s = await getNotificationSettings();
      setSettings(s);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch {
      setError("No se pudieron cargar las preferencias.");
    }
    finally { setLoading(false); if (isRefresh) setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadSettings(); }, []));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveNotificationSettings(settings);
      if (settings.enabled) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert("Permisos denegados", "Habilitá las notificaciones en la configuración.");
          setSaving(false); return;
        }
        const cardsR = await getCreditCards();
        const cards: CreditCardForNotification[] = cardsR.items;
        const count = await scheduleCardNotifications(cards);
        setScheduledCount(count);
        Alert.alert("Programadas", `${count} recordatorio${count !== 1 ? "s" : ""}.`);
      } else {
        await cancelAllScheduledNotifications();
        setScheduledCount(0);
        Alert.alert("Desactivadas", "Se cancelaron los recordatorios.");
      }
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally { setSaving(false); }
  };

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading || !settings) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => loadSettings()} />;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadSettings(true)}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* Enable toggle */}
      <View style={[s.card, settings.enabled && s.cardActive]}>
        <View style={s.switchRow}>
          <View style={s.switchInfo}>
            <View style={s.switchIconBox}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={s.switchLabel}>Recordatorios</Text>
              <Text style={s.switchHint}>
                {settings.enabled ? "Activados" : "Desactivados"}
              </Text>
            </View>
          </View>
          <Switch value={settings.enabled} onValueChange={(v) => updateSetting("enabled", v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={settings.enabled ? colors.textPrimary : colors.textMuted} />
        </View>
        {scheduledCount > 0 && (
          <Text style={s.scheduledInfo}>
            {scheduledCount} notificación{scheduledCount !== 1 ? "es" : ""} programada{scheduledCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {settings.enabled && (
        <>
          {/* Days before closing */}
          <View style={s.cardOption}>
            <Text style={s.optionTitle}>
              <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} /> Días antes del cierre
            </Text>
            <Text style={s.optionDesc}>Recibir aviso antes del cierre del período</Text>
            <View style={s.chipRow}>
              {DAYS_OPTIONS.map((d) => (
                <OptionChip key={d} label={`${d} día${d !== 1 ? "s" : ""}`}
                  active={settings.daysBeforeClosing === d}
                  onPress={() => updateSetting("daysBeforeClosing", d)} />
              ))}
            </View>
          </View>

          {/* Days before due date */}
          <View style={s.cardOption}>
            <Text style={s.optionTitle}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.textSecondary} /> Días antes del vencimiento
            </Text>
            <Text style={s.optionDesc}>Recibir aviso antes de la fecha de pago</Text>
            <View style={s.chipRow}>
              {DAYS_OPTIONS.map((d) => (
                <OptionChip key={d} label={`${d} día${d !== 1 ? "s" : ""}`}
                  active={settings.daysBeforeDueDate === d}
                  onPress={() => updateSetting("daysBeforeDueDate", d)} />
              ))}
            </View>
          </View>

          {/* Hour */}
          <View style={s.cardOption}>
            <Text style={s.optionTitle}>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} /> Hora de notificación
            </Text>
            <Text style={s.optionDesc}>¿A qué hora querés recibirlas?</Text>
            <View style={s.chipRow}>
              {HOUR_OPTIONS.map((h) => (
                <OptionChip key={h} label={`${h.toString().padStart(2, "0")}:00`}
                  active={settings.notificationHour === h}
                  onPress={() => updateSetting("notificationHour", h)} />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Save */}
      <Pressable onPress={handleSave} disabled={saving}
        style={({ pressed }) => [s.saveButton, saving && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}>
        {saving ? <ActivityIndicator color={colors.textPrimary} /> : <>
          <Ionicons name="checkmark-circle" size={18} color={colors.textPrimary} />
          <Text style={s.saveText}>Guardar y Programar</Text>
        </>}
      </Pressable>

      {/* Info */}
      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
        <Text style={s.infoText}>
          Los recordatorios se calculan con las fechas de cierre y vencimiento de tus tarjetas.
          Se reprograman cada vez que abrís la app o guardás cambios.
        </Text>
      </View>
      <View style={{ height: TAB_BAR_SPACER_HEIGHT }} />
    </ScrollView>
  );
}

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}
      style={[s.chip, active && s.chipActive]}
      accessibilityLabel={label} accessibilityRole="radio">
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },

  card: { ...glassSurface(false), padding: 18, marginBottom: 14 },
  cardActive: { borderColor: colors.accent, borderWidth: 1.5 },
  cardOption: { ...glassSurface(false), padding: 16, marginBottom: 10 },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchIconBox: {
    width: 40, height: 40, borderRadius: borderRadius.card,
    backgroundColor: "rgba(59,130,246,0.12)", justifyContent: "center", alignItems: "center",
  },
  switchLabel: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  scheduledInfo: { marginTop: 10, fontSize: 13, color: colors.success, fontWeight: "500" },

  optionTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
  optionDesc: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary },

  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accent, borderRadius: borderRadius.card, padding: 14, marginTop: 6, marginBottom: 16 },
  saveText: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  infoBox: { flexDirection: "row", gap: 8, backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, color: colors.textSubtle, lineHeight: 18 },
});
