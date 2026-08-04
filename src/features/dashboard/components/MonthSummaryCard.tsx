import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { memo, useMemo } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface, iconContainer } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { borderRadius } from "@/shared/theme/tokens";
import { useMonthlyStats } from "../services/statsApi";

interface MonthSummaryCardProps {
  creditCardId: string;
  nextPeriodCLP?: number;
  nextPeriodUSD?: number;
}

/** YYYY-MM key for backend matching. */
function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

const MONTH_NAMES_LONG = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Spanish display name from YYYY-MM key, e.g. "2026-08" → "Agosto". */
function monthDisplayName(key: string): string {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [, month] = key.split("-");
    const idx = parseInt(month, 10);
    return MONTH_NAMES_LONG[idx];
  }
  return key;
}

const MonthSummaryCardComponent = ({
  creditCardId,
  nextPeriodCLP,
  nextPeriodUSD,
}: MonthSummaryCardProps) => {
  const router = useRouter();
  const { data: stats = [], isLoading } = useMonthlyStats(creditCardId);

  const { currentMonth, previousMonth } = useMemo(() => {
    const now = new Date();
    const currentKey = toMonthKey(now);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = toMonthKey(prev);
    const current = stats.find((s) => s.month === currentKey) || null;
    const previous = stats.find((s) => s.month === prevKey) || null;
    return { currentMonth: current, previousMonth: previous };
  }, [stats]);

  if (isLoading) return null;

  const totalCLP = currentMonth?.totalCLP ?? 0;
  const totalUSD = currentMonth?.totalUSD ?? 0;
  const prevCLP = previousMonth?.totalCLP ?? 0;
  const hasData = totalCLP > 0 || totalUSD > 0 || prevCLP > 0;

  let variationPercent = 0;
  let variationDirection: "up" | "down" | "same" = "same";
  if (prevCLP > 0 && totalCLP > 0) {
    variationPercent = Math.round(((totalCLP - prevCLP) / prevCLP) * 100);
    variationDirection =
      variationPercent > 0 ? "up" : variationPercent < 0 ? "down" : "same";
  }

  const currentKey = toMonthKey(new Date());
  const displayName = monthDisplayName(currentKey);
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
      accessibilityRole="button"
      accessibilityLabel={`Resumen de ${displayName}. Ver detalle de movimientos`}
      hitSlop={4}
    >
      {hasData ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Resumen de {displayName}</Text>
            <View style={styles.totalContainer}>
              <Text style={styles.totalCLP}>
                ${totalCLP.toLocaleString("es-CL")}
              </Text>
              {totalUSD > 0 && (
                <Text style={styles.totalUSD}>US$ {totalUSD.toFixed(2)}</Text>
              )}
            </View>
          </View>

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
                      ? colors.destructive
                      : variationDirection === "down"
                        ? colors.success
                        : colors.textMuted
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

          {hasEstimatedBill && (
            <View style={styles.estimatedContainer}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.estimatedLabel}>
                Proyección próximo período:{" "}
                <Text style={styles.estimatedAmount}>
                  ${nextPeriodCLP.toLocaleString("es-CL")}
                </Text>
              </Text>
            </View>
          )}

          {currentMonth?.categoryBreakdown && (
            <View style={styles.categoryContainer}>
              {Object.entries(currentMonth.categoryBreakdown)
                .sort(([, a], [, b]) => b.CLP - a.CLP)
                .slice(0, 3)
                .map(([categoryId, data]) => (
                  <Pressable
                    key={categoryId}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      pressed && styles.categoryRowPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/(drawer)/transactions",
                        params: {
                          creditCardId,
                          categoryId,
                          categoryName: data.categoryName,
                        },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver transacciones de ${data.categoryName}`}
                  >
                    <View style={styles.categoryLeft}>
                      <Text
                        style={styles.categoryName}
                        numberOfLines={1}
                      >
                        {data.categoryName}
                      </Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryAmount}>
                        ${data.CLP.toLocaleString("es-CL")}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={colors.textMuted}
                      />
                    </View>
                  </Pressable>
                ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="card-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.emptyTextBlock}>
            <Text style={styles.emptyTitle}>Sin gastos en {displayName}</Text>
            <Text style={styles.emptySubtitle}>
              Importe sus movimientos para ver el resumen del mes aquí
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {hasData ? "Ver detalle" : "Ir a movimientos"}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...glassSurface(false),
    padding: 16,
    marginTop: 16,
  } as any,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  totalContainer: {
    alignItems: "flex-end",
  },
  totalCLP: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  totalUSD: {
    fontSize: 14,
    color: colors.accent,
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
    color: colors.textMuted,
  },
  variationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.card,
    backgroundColor: colors.borderLight,
    gap: 2,
  },
  variationUp: {
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  variationDown: {
    backgroundColor: "rgba(5, 150, 105, 0.12)",
  },
  variationPercent: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  variationUpText: {
    color: colors.destructive,
  },
  variationDownText: {
    color: colors.success,
  },
  estimatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  estimatedLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  estimatedAmount: {
    fontWeight: "600",
    color: colors.textSecondary,
  },
  categoryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: -8,
  },
  categoryRowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  categoryLeft: {
    flex: 1,
    marginRight: 8,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  emptyIconWrap: {
    ...iconContainer,
  },
  emptyTextBlock: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "500",
  },
});

export default memo(MonthSummaryCardComponent);
