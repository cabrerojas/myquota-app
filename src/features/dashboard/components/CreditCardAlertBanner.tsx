import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CreditCardWithLimits {
  id: string;
  cardType: string;
  cardLastDigits: string;
  nationalAmountUsed: number;
  nationalTotalLimit: number;
  internationalAmountUsed: number;
  internationalTotalLimit: number;
}

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
    // National
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
    // International
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
  const bgColor = hasCritical ? "#FFF3F3" : "#FFF8E1";
  const borderColor = hasCritical ? "#FFCDD2" : "#FFE082";
  const iconColor = hasCritical ? "#DC3545" : "#F57C00";
  const icon = hasCritical ? "alert-circle" : "warning";

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.headerText, { color: iconColor }]}>
          {hasCritical ? "¡Cupo crítico!" : "Alerta de cupo"}
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={18} color="#ADB5BD" />
          </TouchableOpacity>
        )}
      </View>

      {alerts.map((alert, index) => (
        <View key={`${alert.card.id}-${alert.type}-${index}`} style={styles.alertRow}>
          <View style={styles.alertDot}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    alert.level === "critical" ? "#DC3545" : "#F57C00",
                },
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
                {
                  color:
                    alert.level === "critical" ? "#DC3545" : "#F57C00",
                },
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
    borderRadius: 12,
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
    padding: 2,
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
    color: "#495057",
    flex: 1,
  },
  alertCardName: {
    fontWeight: "600",
  },
  alertPercent: {
    fontWeight: "700",
  },
});
