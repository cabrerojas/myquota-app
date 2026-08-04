import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { glassSubtle } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { borderRadius, spacing } from "@/shared/theme/tokens";
import { CreditCardWithLimits } from "@/shared/types/creditCard";

interface CreditCardAlertBannerProps {
  creditCards: CreditCardWithLimits[];
  onDismiss?: () => void;
}

interface CardAlert {
  card: CreditCardWithLimits;
  type: "national" | "international";
  percent: number;
  level: "warning" | "critical";
}

const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 95;

export default function CreditCardAlertBanner({
  creditCards,
  onDismiss,
}: CreditCardAlertBannerProps) {
  const alerts: CardAlert[] = [];

  creditCards.forEach((card) => {
    if (card.nationalTotalLimit > 0) {
      const percent = (card.nationalAmountUsed / card.nationalTotalLimit) * 100;
      if (percent >= WARNING_THRESHOLD) {
        alerts.push({
          card,
          type: "national",
          percent: Math.round(percent),
          level: percent >= CRITICAL_THRESHOLD ? "critical" : "warning",
        });
      }
    }
    if (card.internationalTotalLimit > 0) {
      const percent =
        (card.internationalAmountUsed / card.internationalTotalLimit) * 100;
      if (percent >= WARNING_THRESHOLD) {
        alerts.push({
          card,
          type: "international",
          percent: Math.round(percent),
          level: percent >= CRITICAL_THRESHOLD ? "critical" : "warning",
        });
      }
    }
  });

  if (alerts.length === 0) return null;

  const hasCritical = alerts.some((a) => a.level === "critical");
  const accentColor = hasCritical ? colors.destructive : colors.warning;
  const bgGlow = hasCritical
    ? "rgba(220, 38, 38, 0.1)"
    : "rgba(217, 119, 6, 0.1)";
  const borderColor = hasCritical
    ? "rgba(220, 38, 38, 0.25)"
    : "rgba(217, 119, 6, 0.25)";
  const icon = hasCritical ? "alert-circle" : "warning";

  return (
    <View style={[styles.container, { backgroundColor: bgGlow, borderColor }]}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={20} color={accentColor} />
        <Text style={[styles.headerText, { color: accentColor }]}>
          {hasCritical ? "¡Cupo crítico!" : "Alerta de cupo"}
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {alerts.map((alert, index) => (
        <View
          key={`${alert.card.id}-${alert.type}-${index}`}
          style={styles.alertRow}
        >
          <View style={styles.alertDot}>
            <View
              style={[
                styles.dot,
                { backgroundColor: alert.level === "critical" ? colors.destructive : colors.warning },
              ]}
            />
          </View>
          <Text style={styles.alertText}>
            <Text style={styles.alertCardName}>
              {alert.card.cardType} •{alert.card.cardLastDigits}
            </Text>
            {" — "}
            {alert.type === "national" ? "Cupo nacional" : "Cupo internacional"}
            {" al "}
            <Text
              style={[
                styles.alertPercent,
                { color: alert.level === "critical" ? colors.destructive : colors.warning },
              ]}
            >
              {alert.percent}%
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.card,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  dismissButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  alertDot: {
    width: 16,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  alertCardName: {
    fontWeight: "600",
  },
  alertPercent: {
    fontWeight: "700",
  },
});
