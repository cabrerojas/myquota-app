import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, Animated, Alert,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { formatDateInput, toISODateString } from "@/shared/utils/format";
import { colors } from "@/shared/theme/colors";
import { borderRadius } from "@/shared/theme/tokens";

// DateTimePicker crashes at module level on web — use dynamic require
const DateTimePicker: any = Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;
type PickerEvent = { type: string; nativeEvent: { timestamp: number } };

interface BillingPeriodFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    creditCardId: string; month: string; startDate: string; endDate: string; dueDate: string;
  }) => Promise<void>;
  initialData?: { creditCardId?: string; month?: string; startDate?: string; endDate?: string; dueDate?: string };
  title?: string;
  isOrphanSuggestion?: boolean;
  orphanedCount?: number;
  isFirstTime?: boolean;
}

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

/** Internal key: YYYY-MM for the backend VARCHAR(7) column. */
const toMonthKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
};

/** Human-readable label derived from a YYYY-MM key, e.g. "2026-07" → "Julio 2026". */
const toMonthDisplay = (key: string): string => {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, m] = key.split("-");
    const idx = Number(m) - 1;
    return `${MONTH_NAMES[idx] || m} ${year}`;
  }
  return key;
};

/** Parses an ISO date string as local Chile time, avoiding UTC shift */
function parseDateLocal(dateStr: string): Date {
  const d = new Date(dateStr);
  const chileDateStr = d.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
  const [day, month, year] = chileDateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

type WizardStep = "intro" | "form";

export default function BillingPeriodFormModal({
  visible, onClose, onSubmit, initialData,
  title = "Crear Período de Facturación", isOrphanSuggestion = false, orphanedCount = 0,
  isFirstTime = false,
}: BillingPeriodFormModalProps) {
  const [step, setStep] = useState<WizardStep>(isFirstTime ? "intro" : "form");
  const [creditCardId, setCreditCardId] = useState("");
  const [month, setMonth] = useState("");                 // YYYY-MM (backend key)
  const [displayMonth, setDisplayMonth] = useState("");   // "Julio 2026" (user sees)
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(isFirstTime ? "intro" : "form");
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, isFirstTime, fadeAnim]);

  useEffect(() => {
    if (initialData) {
      if (initialData.creditCardId) setCreditCardId(initialData.creditCardId);
      if (initialData.month) {
        setMonth(initialData.month);
        setDisplayMonth(toMonthDisplay(initialData.month));
      }
      if (initialData.startDate) setStartDate(parseDateLocal(initialData.startDate));
      if (initialData.endDate) setEndDate(parseDateLocal(initialData.endDate));
      if (initialData.dueDate) setDueDate(parseDateLocal(initialData.dueDate));
    } else {
      setCreditCardId(""); setMonth(""); setDisplayMonth("");
      setStartDate(new Date()); setEndDate(new Date()); setDueDate(new Date());
    }
  }, [initialData, visible]);

  const handleSubmit = async () => {
    if (!month.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ creditCardId, month: month.trim(),
        startDate: toISODateString(startDate), endDate: toISODateString(endDate), dueDate: toISODateString(dueDate) });
      onClose();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo crear el período");
    } finally { setIsSubmitting(false); }
  };

  const onDateChange = (setter: (d: Date) => void, showSetter: (v: boolean) => void) =>
    (_: PickerEvent, date?: Date) => {
      showSetter(Platform.OS === "ios");
      if (date) setter(date);
    };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.modal}>
          {step === "intro" ? (
            <IntroStep
              orphanedCount={orphanedCount}
              onContinue={() => setStep("form")}
              onSkip={onClose}
            />
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header */}
                <View style={s.header}>
                  <View style={s.headerIcon}>
                    <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{title}</Text>
                    {isFirstTime && (
                      <Text style={s.stepHint}>Paso 2 de 2</Text>
                    )}
                  </View>
                  <Pressable onPress={onClose} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel="Cerrar" accessibilityRole="button">
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* Progress bar for wizard mode */}
                {isFirstTime && (
                  <View style={s.progressBar}>
                    <View style={s.progressFill} />
                  </View>
                )}

                {/* Orphan alert */}
                {isOrphanSuggestion && orphanedCount > 0 && (
                  <View style={s.alertBox}>
                    <Ionicons name="warning" size={18} color={colors.warning} style={{ marginTop: 1 }} />
                    <Text style={s.alertText}>
                      <Text style={s.alertBold}>{orphanedCount} transacciones</Text> sin período asignado.
                      Completá el formulario para organizarlas.
                    </Text>
                  </View>
                )}

                {/* Period name */}
                <Text style={s.label}>Nombre del período</Text>
                <TextInput style={s.input} value={displayMonth} onChangeText={setDisplayMonth}
                  placeholder="Ej: Julio 2026" placeholderTextColor={colors.textSubtle} />

                {/* Start date */}
                <Text style={s.label}>Fecha de inicio</Text>
                <DateField date={startDate} onPress={() => setShowStartPicker(true)} />
                {showStartPicker && (
                  Platform.OS === "web" ? (
                    <input type="date" value={toISODateString(startDate)} style={s.webInput as any}
                      onChange={e => { setShowStartPicker(false); if (e.target.value) setStartDate(new Date(e.target.value + "T00:00:00")); }} />
                  ) : (
                    <DateTimePicker value={startDate} mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange(setStartDate, setShowStartPicker)} />
                  )
                )}

                {/* End date */}
                <Text style={s.label}>Fecha de cierre</Text>
                <DateField date={endDate} onPress={() => setShowEndPicker(true)} />
                {showEndPicker && (
                  Platform.OS === "web" ? (
                    <input type="date" value={toISODateString(endDate)} style={s.webInput as any}
                      onChange={e => { setShowEndPicker(false); if (e.target.value) { const d = new Date(e.target.value + "T00:00:00"); setEndDate(d); const key = toMonthKey(d); setMonth(key); setDisplayMonth(toMonthDisplay(key)); const suggested = new Date(d); suggested.setDate(suggested.getDate() + 20); setDueDate(suggested); } }} />
                  ) : (
                    <DateTimePicker value={endDate} mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(e: PickerEvent, d?: Date) => {
                        setShowEndPicker(Platform.OS === "ios");
                        if (d) { setEndDate(d); const key = toMonthKey(d); setMonth(key); setDisplayMonth(toMonthDisplay(key)); const suggested = new Date(d); suggested.setDate(suggested.getDate() + 20); setDueDate(suggested); }
                      }} />
                  )
                )}

                {/* Due date */}
                <Text style={s.label}>Fecha de vencimiento</Text>
                <DateField date={dueDate} onPress={() => setShowDuePicker(true)} />
                {showDuePicker && (
                  Platform.OS === "web" ? (
                    <input type="date" value={toISODateString(dueDate)} style={s.webInput as any}
                      onChange={e => { setShowDuePicker(false); if (e.target.value) setDueDate(new Date(e.target.value + "T00:00:00")); }} />
                  ) : (
                    <DateTimePicker value={dueDate} mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange(setDueDate, setShowDuePicker)} />
                  )
                )}

                {/* Buttons */}
                <View style={s.buttonRow}>
                  <Pressable onPress={onClose} disabled={isSubmitting}
                    style={({ pressed }) => [s.btn, s.btnCancel, pressed && { opacity: 0.7 }]}>
                    <Text style={s.btnCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={handleSubmit} disabled={isSubmitting || !month.trim()}
                    style={({ pressed }) => [s.btn, s.btnSubmit, (isSubmitting || !month.trim()) && { opacity: 0.5 },
                      pressed && { opacity: 0.85 }]}>
                    {isSubmitting ? <ActivityIndicator size="small" color={colors.textPrimary} /> :
                      <Text style={s.btnSubmitText}>Crear período</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Intro Step (first-time users) ────────────────────────────────────────

function IntroStep({ orphanedCount, onContinue, onSkip }: {
  orphanedCount: number; onContinue: () => void; onSkip: () => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      {/* Celebration */}
      <View style={is.hero}>
        <View style={is.heroIcon}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
        </View>
        <Text style={is.heroTitle}>¡Importación exitosa!</Text>
        <Text style={is.heroSub}>
          {orphanedCount} transacciones encontradas. Ahora organicémoslas.
        </Text>
        <View style={is.progressBar}>
          <View style={is.progressDone} />
          <View style={is.progressPending} />
        </View>
        <View style={is.stepLabels}>
          <Text style={is.stepDone}>Importación ✓</Text>
          <Text style={is.stepActive}>Período</Text>
        </View>
      </View>

      {/* What is it */}
      <Text style={is.sectionTitle}>¿Qué es un período de facturación?</Text>
      <View style={is.infoCards}>
        <View style={is.infoCard}>
          <Ionicons name="calendar-outline" size={22} color={colors.accent} />
          <View style={is.infoText}>
            <Text style={is.infoTitle}>Ciclo mensual</Text>
            <Text style={is.infoDesc}>Es el rango de fechas que cubre cada estado de cuenta de tu tarjeta.</Text>
          </View>
        </View>
        <View style={is.infoCard}>
          <Ionicons name="layers-outline" size={22} color={colors.accent} />
          <View style={is.infoText}>
            <Text style={is.infoTitle}>Organizá tus gastos</Text>
            <Text style={is.infoDesc}>Agrupa transacciones por mes para ver proyecciones y estadísticas.</Text>
          </View>
        </View>
        <View style={is.infoCard}>
          <Ionicons name="alert-circle-outline" size={22} color={colors.accent} />
          <View style={is.infoText}>
            <Text style={is.infoTitle}>Control de vencimientos</Text>
            <Text style={is.infoDesc}>MyQuota te avisará antes del cierre y vencimiento de cada período.</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <Pressable onPress={onContinue}
        style={({ pressed }) => [is.cta, pressed && { opacity: 0.85 }]}>
        <Text style={is.ctaText}>Entendido, crear período</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
      </Pressable>

      <Pressable onPress={onSkip} style={is.skipBtn}>
        <Text style={is.skipText}>Ahora no, después lo configuro</Text>
      </Pressable>
    </ScrollView>
  );
}

const is = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: borderRadius.full, backgroundColor: "rgba(5,150,105,0.1)",
    justifyContent: "center", alignItems: "center", marginBottom: 14, borderWidth: 1, borderColor: "rgba(5,150,105,0.2)" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, marginBottom: 6 },
  heroSub: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 16 },

  progressBar: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden",
    width: 120, marginBottom: 6 },
  progressDone: { flex: 1, backgroundColor: colors.success },
  progressPending: { flex: 1, backgroundColor: colors.border },
  stepLabels: { flexDirection: "row", justifyContent: "space-between", width: 160 },
  stepDone: { fontSize: 10, fontWeight: "600", color: colors.success },
  stepActive: { fontSize: 10, fontWeight: "600", color: colors.accent },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginTop: 20, marginBottom: 12 },

  infoCards: { gap: 10 },
  infoCard: { flexDirection: "row", gap: 12, backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: borderRadius.card, padding: 14, borderWidth: 1, borderColor: colors.border },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
  infoDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accent, borderRadius: 14, padding: 16, marginTop: 24 },
  ctaText: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  skipBtn: { alignItems: "center", marginTop: 14, paddingVertical: 8 },
  skipText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
});

// ─── DateField ────────────────────────────────────────────────────────────

function DateField({ date, onPress }: { date: Date; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.dateBtn, pressed && { opacity: 0.7 }]}
      accessibilityLabel="Seleccionar fecha" accessibilityRole="button">
      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
      <Text style={s.dateText}>{formatDateInput(date)}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36, maxHeight: "88%",
    borderTopWidth: 1, borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  headerIcon: { width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  stepHint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  progressBar: { height: 3, backgroundColor: colors.border, borderRadius: 2,
    marginBottom: 18, overflow: "hidden" },
  progressFill: { height: "100%", width: "100%", backgroundColor: colors.accent, borderRadius: 2 },

  alertBox: { flexDirection: "row", gap: 10, backgroundColor: "rgba(217,119,6,0.08)",
    borderRadius: borderRadius.card, borderWidth: 1, borderColor: "rgba(217,119,6,0.15)",
    padding: 14, marginBottom: 18, alignItems: "flex-start" },
  alertText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  alertBold: { fontWeight: "700", color: colors.warning },

  label: { fontSize: 11, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: "rgba(255,255,255,0.04)", color: colors.textPrimary },
  webInput: { width: "100%", height: 44, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.textPrimary, fontSize: 15 },

  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "rgba(255,255,255,0.04)" },
  dateText: { fontSize: 15, color: colors.textPrimary },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: borderRadius.card, alignItems: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  btnSubmit: { backgroundColor: colors.accent },
  btnSubmitText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
