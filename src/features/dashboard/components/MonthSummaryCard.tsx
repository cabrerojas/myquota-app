import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo } from "react";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMonthlyStats } from "../services/statsApi";

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalUSD: number;
  categoryBreakdown: { [merchant: string]: { CLP: number; USD: number } };
}

interface MonthSummaryCardProps {
  creditCardId: string;
  /** Sum of quota installments falling in the current billing period (the real bill). */
  nextPeriodCLP?: number;
  /** Sum of USD quota installments falling in the current billing period. */
  nextPeriodUSD?: number;
}

// Helper functions moved outside component to avoid recreation
const getCurrentMonthName = (): string => {
  const date = new Date();
  const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "America/Santiago",
  });
  const yearFormatter = new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    timeZone: "America/Santiago",
  });
  const month = monthFormatter.format(date);
  const year = yearFormatter.format(date);
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};

const getPreviousMonthName = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "America/Santiago",
  });
  const yearFormatter = new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    timeZone: "America/Santiago",
  });
  const month = monthFormatter.format(date);
  const year = yearFormatter.format(date);
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};

const MonthSummaryCardComponent = ({
  creditCardId,
  nextPeriodCLP,
  nextPeriodUSD,
}: MonthSummaryCardProps) => {
  const router = useRouter();
  const { data: stats = [], isLoading } = useMonthlyStats(creditCardId);

  // Extract current and previous month data using useMemo to avoid recalculating on every render
  const { currentMonth, previousMonth } = useMemo(() => {
    const currentName = getCurrentMonthName();
    const previousName = getPreviousMonthName();

    const current = stats.find((s) => s.month === currentName) || null;
    const previous = stats.find((s) => s.month === previousName) || null;

    return { currentMonth: current, previousMonth: previous };
  }, [stats]);

  if (isLoading) {
    return null;
  }

  const totalCLP = currentMonth?.totalCLP ?? 0;
  const totalUSD = currentMonth?.totalUSD ?? 0;
  const prevCLP = previousMonth?.totalCLP ?? 0;

  // Calculate variation vs previous month
  let variationPercent = 0;
  let variationDirection: "up" | "down" | "same" = "same";
  if (prevCLP > 0 && totalCLP > 0) {
    variationPercent = Math.round(((totalCLP - prevCLP) / prevCLP) * 100);
    variationDirection =
      variationPercent > 0 ? "up" : variationPercent < 0 ? "down" : "same";
  }

  const monthName = getCurrentMonthName();
  const monthDisplayName = monthName.split(" ")[0]; // Solo el mes sin año

  const hasEstimatedBill = nextPeriodCLP !== undefined && nextPeriodCLP > 0;

  const handleViewTransactions = () => {
    router.push({
      pathname: "/(drawer)/transactions",
      params: { creditCardId },
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleViewTransactions}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{monthDisplayName}</Text>
        <View style={styles.totalContainer}>
          <Text style={styles.totalCLP}>
            ${totalCLP.toLocaleString("es-CL")}
          </Text>
          {totalUSD > 0 && (
            <Text style={styles.totalUSD}>US$ {totalUSD.toFixed(2)}</Text>
          )}
        </View>
      </View>

      {/* Variation indicator */}
      {prevCLP > 0 && (
        <View style={styles.variationRow}>
          <Text style={styles.variationLabel}>vs mes anterior</Text>
          <View
            style={[
              styles.variationBadge,
              variationDirection === "up" && styles.variationUp,
              variationDirection === "down" && styles.variationDown,
            ]}
          >
            <Ionicons
              name={
                variationDirection === "up"
                  ? "arrow-up"
                  : variationDirection === "down"
                    ? "arrow-down"
                    : "remove"
              }
              size={12}
              color={
                variationDirection === "up"
                  ? "#DC3545"
                  : variationDirection === "down"
                    ? "#28A745"
                    : "#6C757D"
              }
            />
            <Text
              style={[
                styles.variationPercent,
                variationDirection === "up" && styles.variationUpText,
                variationDirection === "down" && styles.variationDownText,
              ]}
            >
              {Math.abs(variationPercent)}%
            </Text>
          </View>
        </View>
      )}

      {/* Estimated bill indicator */}
      {hasEstimatedBill && (
        <View style={styles.estimatedContainer}>
          <Ionicons name="calendar-outline" size={14} color="#6C757D" />
          <Text style={styles.estimatedLabel}>
            Proyección próximo período:{" "}
            <Text style={styles.estimatedAmount}>
              ${nextPeriodCLP.toLocaleString("es-CL")}
            </Text>
          </Text>
        </View>
      )}

      {/* Category breakdown */}
      {currentMonth?.categoryBreakdown && (
        <View style={styles.categoryContainer}>
          {Object.entries(currentMonth.categoryBreakdown)
            .sort(([, a], [, b]) => b.CLP - a.CLP)
            .slice(0, 3)
            .map(([category, amounts]) => (
              <View key={category} style={styles.categoryRow}>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category}
                </Text>
                <Text style={styles.categoryAmount}>
                  ${amounts.CLP.toLocaleString("es-CL")}
                </Text>
              </View>
            ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ver detalle</Text>
        <Ionicons name="chevron-forward" size={16} color="#007BFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
  },
  totalContainer: {
    alignItems: "flex-end",
  },
  totalCLP: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
  },
  totalUSD: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "500",
  },
  variationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  variationLabel: {
    fontSize: 12,
    color: "#6C757D",
  },
  variationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    gap: 2,
  },
  variationUp: {
    backgroundColor: "#FFEBEE",
  },
  variationDown: {
    backgroundColor: "#E8F5E9",
  },
  variationPercent: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6C757D",
  },
  variationUpText: {
    color: "#DC3545",
  },
  variationDownText: {
    color: "#28A745",
  },
  estimatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  estimatedLabel: {
    fontSize: 12,
    color: "#6C757D",
  },
  estimatedAmount: {
    fontWeight: "600",
    color: "#495057",
  },
  categoryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  categoryName: {
    fontSize: 13,
    color: "#495057",
    flex: 1,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: "500",
    color: "#212529",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  footerText: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "500",
  },
});

// Memoize to prevent unnecessary re-renders
export default memo(MonthSummaryCardComponent);
