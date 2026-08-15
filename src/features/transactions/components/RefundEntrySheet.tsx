import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, colors, spacing } from "@/shared/theme/tokens";
import { formatCurrency } from "@/shared/utils/format";

interface RefundEntrySheetProps {
  visible: boolean;
  currency: string;
  refundableAmount: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { amount: number; reason?: string }) => Promise<void>;
}

export function RefundEntrySheet({
  visible,
  currency,
  refundableAmount,
  submitting,
  onClose,
  onSubmit,
}: RefundEntrySheetProps) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setAmount("");
    setReason("");
    setSubmitError(null);
  }, [visible]);

  const parsedAmount = useMemo(
    () => Number(amount.replace(",", ".")),
    [amount],
  );

  const validationError = useMemo(() => {
    if (!amount.trim()) {
      return "Ingresa un monto válido mayor a cero.";
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return "Ingresa un monto válido mayor a cero.";
    }

    if (parsedAmount > refundableAmount) {
      return "El monto supera el disponible para reembolso.";
    }

    return null;
  }, [amount, parsedAmount, refundableAmount]);

  const closeSheet = () => {
    if (submitting) {
      return;
    }

    onClose();
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async () => {
    if (validationError || submitting) {
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit({
        amount: parsedAmount,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el reembolso",
      );
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={closeSheet}
      presentationStyle="pageSheet"
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Cerrar hoja de reembolso"
          onPress={closeSheet}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md2) },
          ]}
        >
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>
            Registrar reembolso
          </Text>
          <Text style={styles.subtitle}>
            Disponible para reembolso:{" "}
            {formatCurrency(refundableAmount, currency)}
          </Text>

          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Monto reembolsado</Text>
            <TextInput
              accessibilityLabel="Monto del reembolso"
              keyboardType="decimal-pad"
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={amount}
            />

            <Pressable
              accessibilityLabel="Usar el monto disponible"
              accessibilityRole="button"
              onPress={() => handleAmountChange(String(refundableAmount))}
              style={({ pressed }) => [
                styles.helperButton,
                pressed && styles.helperButtonPressed,
              ]}
            >
              <Text style={styles.helperButtonText}>
                Usar el monto disponible
              </Text>
            </Pressable>

            <Text style={styles.label}>Motivo (opcional)</Text>
            <TextInput
              accessibilityLabel="Motivo del reembolso"
              multiline
              onChangeText={handleReasonChange}
              placeholder="Describe el motivo del reembolso"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textarea]}
              textAlignVertical="top"
              value={reason}
            />

            {(submitError || validationError) && (
              <Text style={styles.errorText}>
                {submitError || validationError}
              </Text>
            )}

            <View style={styles.helperCard}>
              <Ionicons
                color={colors.textMuted}
                name="information-circle-outline"
                size={16}
              />
              <Text style={styles.helperText}>
                El reembolso se registrará como un movimiento vinculado y
                actualizará el estado de la compra.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Cancelar reembolso"
              accessibilityRole="button"
              disabled={submitting}
              onPress={closeSheet}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !submitting && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Confirmar reembolso"
              accessibilityRole="button"
              disabled={submitting || !!validationError}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  !submitting &&
                  !validationError &&
                  styles.buttonPressed,
                (submitting || validationError) && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Registrar reembolso
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.glass,
    borderTopRightRadius: borderRadius.glass,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm2,
    gap: spacing.sm,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textarea: {
    minHeight: 112,
    paddingTop: spacing.sm2,
  },
  helperButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  helperButtonPressed: {
    opacity: 0.7,
  },
  helperButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.destructive,
  },
  helperCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg,
    padding: spacing.sm2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm2,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
