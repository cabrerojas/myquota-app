import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";
import PressableScale from "@/shared/components/PressableScale";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = "Algo salió mal al cargar los datos",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons
          name="alert-circle-outline"
          size={40}
          color={colors.destructive}
        />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <PressableScale style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color={colors.accent} />
          <Text style={styles.retryText}>Reintentar</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
