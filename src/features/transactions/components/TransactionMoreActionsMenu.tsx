import { useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, colors, spacing } from "@/shared/theme/tokens";

interface TransactionMoreActionsMenuProps {
  visible: boolean;
  submitting?: boolean;
  onRegisterRefund: () => void;
}

export function TransactionMoreActionsMenu({
  visible,
  submitting = false,
  onRegisterRefund,
}: TransactionMoreActionsMenuProps) {
  const insets = useSafeAreaInsets();
  const [androidMenuVisible, setAndroidMenuVisible] = useState(false);

  const triggerDisabled = !visible || submitting;
  const closeAndroidMenu = () => {
    if (submitting) {
      return;
    }

    setAndroidMenuVisible(false);
  };

  const handleRegisterRefund = () => {
    if (submitting) {
      return;
    }

    setAndroidMenuVisible(false);
    onRegisterRefund();
  };

  const handleTriggerPress = () => {
    if (triggerDisabled) {
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Registrar reembolso"],
          cancelButtonIndex: 0,
        },
        (selectedIndex) => {
          if (selectedIndex === 1) {
            onRegisterRefund();
          }
        },
      );
      return;
    }

    setAndroidMenuVisible(true);
  };

  const bottomPadding = useMemo(
    () => Math.max(insets.bottom, spacing.md2),
    [insets.bottom],
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Más acciones"
        accessibilityRole="button"
        accessibilityState={{ disabled: triggerDisabled }}
        disabled={triggerDisabled}
        hitSlop={8}
        onPress={handleTriggerPress}
        style={({ pressed }) => [
          styles.trigger,
          pressed && !triggerDisabled && styles.triggerPressed,
          triggerDisabled && styles.triggerDisabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.textPrimary}
          />
        )}
      </Pressable>

      {Platform.OS !== "ios" && (
        <Modal
          animationType="fade"
          onRequestClose={closeAndroidMenu}
          transparent
          visible={androidMenuVisible}
        >
          <View style={styles.overlay}>
            <Pressable
              accessibilityLabel="Cerrar acciones"
              onPress={closeAndroidMenu}
              style={styles.backdrop}
            />
            <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Más acciones</Text>
              <Pressable
                accessibilityLabel="Registrar reembolso"
                accessibilityRole="button"
                disabled={submitting}
                onPress={handleRegisterRefund}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !submitting && styles.actionRowPressed,
                  submitting && styles.actionRowDisabled,
                ]}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={18}
                  color={colors.textPrimary}
                />
                <Text style={styles.actionText}>Registrar reembolso</Text>
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : null}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.pill,
  },
  triggerPressed: {
    opacity: 0.7,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
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
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  actionRow: {
    minHeight: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.75,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
