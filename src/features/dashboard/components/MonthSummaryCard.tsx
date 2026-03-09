import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMonthlyStats } from "../services/statsApi";
import { isSessionExpired } from "@/shared/utils/authEvents";

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalDolar: number;
  categoryBreakdown: { [merchant: string]: { CLP: number; Dolar: number } };
}

interface MonthSummaryCardProps {
  creditCardId: string;
  refreshKey?: number;
  /** Sum of quota installments falling in the current billing period (the real bill). */
  nextPeriodCLP?: number;
  /** Sum of USD quota installments falling in the current billing period. */
  nextPeriodUSD?: number;
}

const _MONTH_NAMES: Record<string, string> = {
  Enero: "Enero",
  Febrero: "Febrero",
  Marzo: "Marzo",
  Abril: "Abril",
  Mayo: "Mayo",
  Junio: "Junio",
  Julio: "Julio",
  Agosto: "Agosto",
  Septiembre: "Septiembre",
  Octubre: "Octubre",
  Noviembre: "Noviembre",
  Diciembre: "Diciembre",
};

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

export default function MonthSummaryCard({
  creditCardId,
  refreshKey,
  nextPeriodCLP,
  nextPeriodUSD,
}: MonthSummaryCardProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<MonthlyStat | null>(null);
  const [previousMonth, setPreviousMonth] = useState<MonthlyStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthlyStats(creditCardId)
      .then((stats: MonthlyStat[]) => {
        const currentName = getCurrentMonthName();
        const previousName = getPreviousMonthName();

        const current = stats.find((s) => s.month === currentName) || null;
        const previous = stats.find((s) => s.month === previousName) || null;

        setCurrentMonth(current);
        setPreviousMonth(previous);
      })
      .catch((e: unknown) => {
        if (!isSessionExpired()) console.error(e);
      })
      .finally(() => setLoading(false));
  }, [creditCardId, refreshKey]);

  if (loading) {
    return null;
  }

  const totalCLP = currentMonth?.totalCLP ?? 0;
  const totalUSD = currentMonth?.totalDolar ?? 0;
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
  const hasEstimatedUSD = nextPeriodUSD !== undefined && nextPeriodUSD > 0;

  // Compute top category for the current month
  const breakdown = currentMonth?.categoryBreakdown ?? {};
  const topCategoryEntry = Object.entries(breakdown)
    .filter(([, v]) => v.CLP > 0)
    .sort((a, b) => b[1].CLP - a[1].CLP)[0];
  const topCategory = topCategoryEntry ? topCategoryEntry[0] : null;
  const topCategoryCLP = topCategoryEntry ? topCategoryEntry[1].CLP : 0;
  const topCategoryPct =
    totalCLP > 0 && topCategoryCLP > 0
      ? Math.round((topCategoryCLP / totalCLP) * 100)
      : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons
            name="wallet-outline"
            size={20}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={styles.headerTitle}>Resumen {monthDisplayName}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* ── SECCIÓN HÉROE: Factura estimada ──────────────────────────── */}
        {hasEstimatedBill ? (
          <View style={styles.billSection}>
            <View style={styles.billLabelRow}>
              <Text style={styles.billLabel}>LO QUE PAGARÍAS HOY</Text>
              <View style={styles.billInfoChip}>
                <Ionicons
                  name="information-circle-outline"
                  size={12}
                  color="#0056B3"
                />
                <Text style={styles.billInfoText}>
                  Incluye cuotas anteriores
                </Text>
              </View>
            </View>
            <Text style={styles.billAmount}>
              ${(nextPeriodCLP ?? 0).toLocaleString("es-CL")}
            </Text>
            {hasEstimatedUSD && (
              <Text style={styles.billAmountUSD}>
                US$
                {(nextPeriodUSD ?? 0).toLocaleString("es-CL", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>
        ) : null}

        {/* ── Divider ──────────────────────────────────────────────────── */}
        {hasEstimatedBill && (totalCLP > 0 || totalUSD > 0) && (
          <View style={styles.divider} />
        )}

        {/* ── Compras del período ──────────────────────────────────────── */}
        {totalCLP > 0 || totalUSD > 0 ? (
          <View>
            <View style={styles.purchasesRow}>
              <View>
                <Text style={styles.purchasesLabel}>NUEVAS COMPRAS</Text>
                <Text style={styles.purchasesAmount}>
                  ${totalCLP.toLocaleString("es-CL")}
                </Text>
              </View>
              {variationDirection !== "same" && (
                <View
                  style={[
                    styles.variationBadge,
                    variationDirection === "up"
                      ? styles.variationUp
                      : styles.variationDown,
                  ]}
                >
                  <Ionicons
                    name={
                      variationDirection === "up"
                        ? "trending-up"
                        : "trending-down"
                    }
                    size={14}
                    color={variationDirection === "up" ? "#DC3545" : "#28A745"}
                  />
                  <Text
                    style={[
                      styles.variationText,
                      variationDirection === "up"
                        ? styles.variationTextUp
                        : styles.variationTextDown,
                    ]}
                  >
                    {Math.abs(variationPercent)}%
                  </Text>
                </View>
              )}
            </View>

            {totalUSD > 0 && (
              <Text style={styles.purchasesAmountUSD}>
                US$
                {totalUSD.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
              </Text>
            )}

            {prevCLP > 0 && (
              <View style={styles.comparisonRow}>
                <Ionicons name="time-outline" size={13} color="#ADB5BD" />
                <Text style={styles.comparisonText}>
                  {getPreviousMonthName().split(" ")[0]}: $
                  {prevCLP.toLocaleString("es-CL")}
                </Text>
              </View>
            )}

            {/* ── Top category insight chip ─────────────────── */}
            {topCategory !== null && topCategoryPct > 0 && (
              <View style={styles.topCategoryWrapper}>
                <View style={styles.topCategoryHeader}>
                  <Text style={styles.topCategoryLabel}>
                    Mayor categoría de gasto
                  </Text>
                  <TouchableOpacity
                    style={styles.topCategoryLinkRow}
                    onPress={() => router.push("/(drawer)/charts")}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.topCategoryLink}>Ver desglose</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color="#007BFF"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.topCategoryRow}>
                  <Ionicons
                    name="pie-chart-outline"
                    size={14}
                    color="#007BFF"
                  />
                  <Text style={styles.topCategoryName} numberOfLines={1}>
                    {topCategory}
                  </Text>
                  <View style={styles.topCategoryPct}>
                    <Text style={styles.topCategoryPctText}>
                      {topCategoryPct}%
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {totalCLP === 0 && totalUSD === 0 && !hasEstimatedBill && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={32} color="#CED4DA" />
            <Text style={styles.emptyText}>
              Sin gastos registrados este mes
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  header: {
    backgroundColor: "#007BFF",
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  body: {
    padding: 16,
  },
  // ── Factura estimada (hero) ──────────────────────────────
  billSection: {
    backgroundColor: "#EBF5FF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
  },
  billLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0056B3",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  billInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D0E9FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  billInfoText: {
    fontSize: 10,
    color: "#0056B3",
    fontWeight: "600",
  },
  billAmount: {
    fontSize: 30,
    fontWeight: "800",
    color: "#007BFF",
    letterSpacing: -0.5,
  },
  billAmountUSD: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0056B3",
    marginTop: 2,
  },
  // ── Divider ─────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: "#F1F3F5",
    marginVertical: 14,
  },
  // ── Nuevas compras (secondary) ───────────────────────────
  purchasesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  purchasesLabel: {
    fontSize: 10,
    color: "#868E96",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  purchasesAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#495057",
  },
  purchasesAmountUSD: {
    fontSize: 14,
    fontWeight: "600",
    color: "#868E96",
    marginTop: 4,
  },
  // ── Shared ───────────────────────────────────────────────
  variationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  variationUp: {
    backgroundColor: "rgba(220, 53, 69, 0.08)",
  },
  variationDown: {
    backgroundColor: "rgba(40, 167, 69, 0.08)",
  },
  variationText: {
    fontSize: 13,
    fontWeight: "700",
  },
  variationTextUp: {
    color: "#DC3545",
  },
  variationTextDown: {
    color: "#28A745",
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 5,
  },
  comparisonText: {
    fontSize: 12,
    color: "#ADB5BD",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#868E96",
  },
  // ── Top category chip ────────────────────────────────────
  topCategoryWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    gap: 6,
  },
  topCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topCategoryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topCategoryLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  topCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topCategoryName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
  },
  topCategoryPct: {
    backgroundColor: "#E7F1FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  topCategoryPctText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0056B3",
  },
  topCategoryLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007BFF",
  },
});
