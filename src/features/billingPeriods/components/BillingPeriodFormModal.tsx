import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect } from "react";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

interface BillingPeriodFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => Promise<void>;
  initialData?: {
    month?: string;
    startDate?: string;
    endDate?: string;
    dueDate?: string;
  };
  title?: string;
  isOrphanSuggestion?: boolean;
  orphanedCount?: number;
}

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const getMonthLabel = (date: Date): string =>
  `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

export default function BillingPeriodFormModal({
  visible,
  onClose,
  onSubmit,
  initialData,
  title = "Nuevo Período de Facturación",
  isOrphanSuggestion = false,
  orphanedCount = 0,
}: BillingPeriodFormModalProps) {
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
      if (initialData.month) setMonth(initialData.month);
      if (initialData.startDate) setStartDate(new Date(initialData.startDate));
      if (initialData.endDate) setEndDate(new Date(initialData.endDate));
      if (initialData.dueDate) setDueDate(new Date(initialData.dueDate));
    } else {
      setMonth("");
      setStartDate(new Date());
      setEndDate(new Date());
      setDueDate(new Date());
    }
  }, [initialData, visible]);

  const handleSubmit = async () => {
    if (!month.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        month: month.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dueDate: dueDate.toISOString(),
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const onStartDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (date) setStartDate(date);
  };

  const onEndDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (date) {
      setEndDate(date);
      setMonth(getMonthLabel(date));
      // Suggest due date: 20 days after closing
      const suggested = new Date(date);
      suggested.setDate(suggested.getDate() + 20);
      setDueDate(suggested);
    }
  };

  const onDueDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowDuePicker(Platform.OS === "ios");
    if (date) setDueDate(date);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{title}</Text>

            {isOrphanSuggestion && orphanedCount > 0 && (
              <View style={styles.alertBox}>
                <Text style={styles.alertIcon}>⚠️</Text>
                <Text style={styles.alertText}>
                  Se detectaron{" "}
                  <Text style={styles.boldText}>
                    {orphanedCount} transacciones
                  </Text>{" "}
                  que no pertenecen a ningún período de facturación. Te
                  sugerimos crear uno nuevo para no perder la trazabilidad.
                </Text>
              </View>
            )}

            {/* Nombre del período */}
            <Text style={styles.label}>Nombre del período</Text>
            <TextInput
              style={styles.input}
              value={month}
              onChangeText={setMonth}
              placeholder="Ej: Febrero 2026"
              placeholderTextColor="#999"
            />

            {/* Fecha inicio */}
            <Text style={styles.label}>Fecha de inicio</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateText}>📅 {formatDate(startDate)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onStartDateChange}
              />
            )}

            {/* Fecha fin */}
            <Text style={styles.label}>Fecha de cierre</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateText}>📅 {formatDate(endDate)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onEndDateChange}
              />
            )}

            {/* Fecha vencimiento */}
            <Text style={styles.label}>Fecha de vencimiento (pago)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDuePicker(true)}
            >
              <Text style={styles.dateText}>📅 {formatDate(dueDate)}</Text>
            </TouchableOpacity>
            {showDuePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDueDateChange}
              />
            )}

            {/* Botones */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !month.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 16,
    textAlign: "center",
  },
  alertBox: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFC107",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  alertIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    color: "#212529",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8F9FA",
  },
  dateText: {
    fontSize: 16,
    color: "#212529",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6C757D",
  },
  submitButton: {
    backgroundColor: "#007BFF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
