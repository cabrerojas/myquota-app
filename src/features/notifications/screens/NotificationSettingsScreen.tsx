import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  scheduleCardNotifications,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  CreditCardForNotification,
} from "@/features/notifications/services/notificationService";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";

const DAYS_OPTIONS = [1, 2, 3, 5];
const HOUR_OPTIONS = [7, 8, 9, 10, 12, 18, 20];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const loadSettings = async () => {
    try {
      const s = await getNotificationSettings();
      setSettings(s);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las preferencias");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, []),
  );

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveNotificationSettings(settings);

      if (settings.enabled) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(
            "Permisos denegados",
            "Debes habilitar las notificaciones en la configuración de tu dispositivo.",
          );
          setSaving(false);
          return;
        }

        const cardsResponse = await getCreditCards();
        const cards: CreditCardForNotification[] = cardsResponse.items;
        const count = await scheduleCardNotifications(cards);
        setScheduledCount(count);
        Alert.alert(
          "Notificaciones programadas",
          `Se programaron ${count} recordatorio${count !== 1 ? "s" : ""} para tus tarjetas.`,
        );
      } else {
        await cancelAllScheduledNotifications();
        setScheduledCount(0);
        Alert.alert(
          "Notificaciones desactivadas",
          "Se cancelaron todos los recordatorios.",
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las preferencias";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Enable / Disable */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Ionicons name="notifications-outline" size={22} color="#007BFF" />
            <Text style={styles.switchLabel}>Activar recordatorios</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(v) => updateSetting("enabled", v)}
            trackColor={{ false: "#DEE2E6", true: "#007BFF" }}
            thumbColor="#fff"
          />
        </View>
        {scheduledCount > 0 && (
          <Text style={styles.scheduledInfo}>
            {scheduledCount} notificación{scheduledCount !== 1 ? "es" : ""}{" "}
            programada
            {scheduledCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {settings.enabled && (
        <>
          {/* Days before closing */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="calendar-outline" size={16} color="#495057" />{" "}
              Días antes del cierre
            </Text>
            <Text style={styles.sectionDesc}>
              Recibir aviso antes de que cierre el período de facturación
            </Text>
            <View style={styles.chipRow}>
              {DAYS_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    settings.daysBeforeClosing === d && styles.chipSelected,
                  ]}
                  onPress={() => updateSetting("daysBeforeClosing", d)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.daysBeforeClosing === d &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {d} día{d !== 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Days before due date */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="alert-circle-outline" size={16} color="#495057" />{" "}
              Días antes del vencimiento
            </Text>
            <Text style={styles.sectionDesc}>
              Recibir aviso antes de la fecha de pago
            </Text>
            <View style={styles.chipRow}>
              {DAYS_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    settings.daysBeforeDueDate === d && styles.chipSelected,
                  ]}
                  onPress={() => updateSetting("daysBeforeDueDate", d)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.daysBeforeDueDate === d &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {d} día{d !== 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notification hour */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="time-outline" size={16} color="#495057" /> Hora de
              notificación
            </Text>
            <Text style={styles.sectionDesc}>
              ¿A qué hora quieres recibir los recordatorios?
            </Text>
            <View style={styles.chipRow}>
              {HOUR_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.chip,
                    settings.notificationHour === h && styles.chipSelected,
                  ]}
                  onPress={() => updateSetting("notificationHour", h)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      settings.notificationHour === h &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {h.toString().padStart(2, "0")}:00
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveText}>Guardar y Programar</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#6C757D" />
        <Text style={styles.infoText}>
          Los recordatorios se calculan con las fechas de cierre y vencimiento
          de tus tarjetas. Se reprograman cada vez que abres la app o guardas
          cambios aquí.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontSize: 16, fontWeight: "600", color: "#212529" },
  scheduledInfo: {
    marginTop: 8,
    fontSize: 13,
    color: "#28A745",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  sectionDesc: { fontSize: 13, color: "#6C757D", marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F3F5",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  chipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  chipText: { fontSize: 14, color: "#495057", fontWeight: "500" },
  chipTextSelected: { color: "#fff" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007BFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, color: "#6C757D", lineHeight: 18 },
});
