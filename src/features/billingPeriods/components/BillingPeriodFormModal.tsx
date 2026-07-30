import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { formatDateInput, toISODateString } from "@/shared/utils/format";
import { colors } from "@/shared/theme/colors";

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
}

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const getMonthLabel = (date: Date): string => `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

export default function BillingPeriodFormModal({
  visible, onClose, onSubmit, initialData,
  title = "Crear Período de Facturación", isOrphanSuggestion = false, orphanedCount = 0,
}: BillingPeriodFormModalProps) {
  const [creditCardId, setCreditCardId] = useState("");
  const [month, setMonth] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.creditCardId) setCreditCardId(initialData.creditCardId);
      if (initialData.month) setMonth(initialData.month);
      if (initialData.startDate) setStartDate(new Date(initialData.startDate));
      if (initialData.endDate) setEndDate(new Date(initialData.endDate));
      if (initialData.dueDate) setDueDate(new Date(initialData.dueDate));
    } else {
      setCreditCardId(""); setMonth("");
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
    } catch { /* handled by parent */ }
    finally { setIsSubmitting(false); }
  };

  const onDateChange = (setter: (d: Date) => void, showSetter: (v: boolean) => void) =>
    (_: DateTimePickerEvent, date?: Date) => {
      showSetter(Platform.OS === "ios");
      if (date) setter(date);
    };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.modal}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              </View>
              <Text style={s.title}>{title}</Text>
              <Pressable onPress={onClose} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Cerrar" accessibilityRole="button">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Orphan alert */}
            {isOrphanSuggestion && orphanedCount > 0 && (
              <View style={s.alertBox}>
                <Ionicons name="warning" size={18} color={colors.warning} style={{ marginTop: 1 }} />
                <Text style={s.alertText}>
                  <Text style={s.alertBold}>{orphanedCount} transacciones</Text> sin período de
                  facturación. Creá uno para no perder trazabilidad.
                </Text>
              </View>
            )}

            {/* Period name */}
            <Text style={s.label}>Nombre del período</Text>
            <TextInput style={s.input} value={month} onChangeText={setMonth}
              placeholder="Ej: Febrero 2026" placeholderTextColor={colors.textSubtle} />

            {/* Start date */}
            <Text style={s.label}>Fecha de inicio</Text>
            <DateField date={startDate} onPress={() => setShowStartPicker(true)} />
            {showStartPicker && <DateTimePicker value={startDate} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange(setStartDate, setShowStartPicker)} />}

            {/* End date */}
            <Text style={s.label}>Fecha de cierre</Text>
            <DateField date={endDate} onPress={() => setShowEndPicker(true)} />
            {showEndPicker && <DateTimePicker value={endDate} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => {
                setShowEndPicker(Platform.OS === "ios");
                if (d) {
                  setEndDate(d); setMonth(getMonthLabel(d));
                  const suggested = new Date(d); suggested.setDate(suggested.getDate() + 20);
                  setDueDate(suggested);
                }
              }} />}

            {/* Due date */}
            <Text style={s.label}>Fecha de vencimiento</Text>
            <DateField date={dueDate} onPress={() => setShowDuePicker(true)} />
            {showDuePicker && <DateTimePicker value={dueDate} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange(setDueDate, setShowDuePicker)} />}

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
                  <Text style={s.btnSubmitText}>Guardar</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DateField({ date, onPress }: { date: Date; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.dateBtn, pressed && { opacity: 0.7 }]}
      accessibilityLabel="Seleccionar fecha" accessibilityRole="button">
      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
      <Text style={s.dateText}>{formatDateInput(date)}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36, maxHeight: "88%",
    borderTopWidth: 1, borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  headerIcon: { width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)", justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },

  alertBox: { flexDirection: "row", gap: 10, backgroundColor: "rgba(217,119,6,0.08)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(217,119,6,0.15)",
    padding: 14, marginBottom: 18, alignItems: "flex-start" },
  alertText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  alertBold: { fontWeight: "700", color: colors.warning },

  label: { fontSize: 11, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: "rgba(255,255,255,0.04)", color: colors.textPrimary },

  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "rgba(255,255,255,0.04)" },
  dateText: { fontSize: 15, color: colors.textPrimary },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  btnSubmit: { backgroundColor: colors.accent },
  btnSubmitText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
