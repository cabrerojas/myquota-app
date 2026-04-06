import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import {
  getQuotasByTransaction,
  Quota,
} from "@/features/quotas/services/quotasApi";
import {
  getBillingPeriodsByCreditCard,
  BillingPeriod,
  payBillingPeriod,
} from "@/features/billingPeriods/services/billingPeriodsApi";
import { formatCurrency } from "@/shared/utils/format";
import { isSessionExpired } from "@/shared/utils/authEvents";

interface MonthBucket {
  key: string; // billing period month or "2025-07"
  label: string; // "Enero 2026"
  totalCLP: number;
  totalUSD: number;
  count: number;
  details: {
    merchant: string;
    amount: number;
    currency: string;
    quotaNumber: number;
    totalQuotas: number;
    transactionId: string;
    creditCardId: string;
  }[];
  // For pay action: creditCardId -> billingPeriodId mapping
  periodsByCard: { creditCardId: string; billingPeriodId: string }[];
}

interface QuotaEnriched extends Quota {
  merchant: string;
  creditCardId: string;
  creditCardLabel: string;
  quotaNumber: number;
  totalQuotas: number;
}

// Parse "2026-03" fallback key to timestamp for sorting
const parseCalendarKey = (key: string): number => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).getTime();
};

export default function DebtForecastScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [totalDebtCLP, setTotalDebtCLP] = useState(0);
  const [totalDebtUSD, setTotalDebtUSD] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchDebtForecast = useCallback(async () => {
    try {
      const cardsResponse = await getCreditCards();
      const cards = cardsResponse.items;
      const allQuotas: QuotaEnriched[] = [];
      const allBillingPeriods: BillingPeriod[] = [];

      // Fetch all quotas and billing periods across all cards
      for (const card of cards) {
        const [txs, periods] = await Promise.all([
          getTransactionsByCreditCard(card.id),
          getBillingPeriodsByCreditCard(card.id),
        ]);
        const txItems = txs.items;
        const periodItems = periods.items;
        // Tag each period with its creditCardId (may not come from API)
        allBillingPeriods.push(
          ...periodItems.map((p) => ({ ...p, creditCardId: card.id })),
        );

        const results = await Promise.all(
          txItems.map(async (tx) => {
            const quotas = await getQuotasByTransaction(card.id, tx.id);
            const sorted = [...quotas].sort(
              (a, b) =>
                new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
            );
            return sorted.map((q, idx) => ({
              ...q,
              merchant: tx.merchant,
              creditCardId: card.id,
              creditCardLabel: `${card.cardType} •${card.cardLastDigits}`,
              quotaNumber: idx + 1,
              totalQuotas: sorted.length,
            }));
          }),
        );
        allQuotas.push(...results.flat());
      }

      // Filter only pending
      const pending = allQuotas.filter((q) => q.status === "pending");

      // Sort billing periods by startDate
      const sortedPeriods = [...allBillingPeriods].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      // Find which billing period a quota's dueDate falls into
      const findPeriodForQuota = (dueDate: string): BillingPeriod | null => {
        const d = new Date(dueDate).getTime();
        for (const p of sortedPeriods) {
          const start = new Date(p.startDate).getTime();
          const end = new Date(p.endDate).getTime();
          if (d >= start && d <= end) return p;
        }
        return null;
      };

      // Group by billing period; fall back to calendar month for unmatched
      const bucketMap = new Map<string, MonthBucket>();
      for (const q of pending) {
        const period = findPeriodForQuota(q.dueDate);
        let key: string;
        let label: string;

        if (period) {
          // Use billing period month as key (e.g. "Enero 2026")
          key = period.month;
          label = period.month;
        } else {
          // Fallback: calendar month for quotas outside any billing period
          const date = new Date(q.dueDate);
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          const monthLabel = date.toLocaleDateString("es-CL", {
            month: "long",
            year: "numeric",
            timeZone: "America/Santiago",
          });
          label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        }

        if (!bucketMap.has(key)) {
          bucketMap.set(key, {
            key,
            label,
            totalCLP: 0,
            totalUSD: 0,
            count: 0,
            details: [],
            periodsByCard: [],
          });
        }
        const bucket = bucketMap.get(key)!;
        if (q.currency === "USD") {
          bucket.totalUSD += q.amount;
        } else {
          bucket.totalCLP += q.amount;
        }
        bucket.count += 1;
        bucket.details.push({
          merchant: q.merchant,
          amount: q.amount,
          currency: q.currency,
          quotaNumber: q.quotaNumber,
          totalQuotas: q.totalQuotas,
          transactionId: q.transactionId,
          creditCardId: q.creditCardId,
        });
      }

      // Populate periodsByCard for pay action
      for (const p of allBillingPeriods) {
        const bucket = bucketMap.get(p.month);
        if (bucket) {
          const existing = bucket.periodsByCard.find(
            (pb) =>
              pb.creditCardId === p.creditCardId && pb.billingPeriodId === p.id,
          );
          if (!existing) {
            bucket.periodsByCard.push({
              creditCardId: p.creditCardId,
              billingPeriodId: p.id,
            });
          }
        }
      }

      // Sort buckets: billing period keys first (by finding their startDate), then calendar keys
      const periodStartMap = new Map<string, number>();
      for (const p of sortedPeriods) {
        if (!periodStartMap.has(p.month)) {
          periodStartMap.set(p.month, new Date(p.startDate).getTime());
        }
      }

      const sorted = Array.from(bucketMap.values()).sort((a, b) => {
        const aTime = periodStartMap.get(a.key) ?? parseCalendarKey(a.key);
        const bTime = periodStartMap.get(b.key) ?? parseCalendarKey(b.key);
        return aTime - bTime;
      });
      setMonths(sorted);

      // Totals
      setTotalDebtCLP(
        pending
          .filter((q) => q.currency !== "USD")
          .reduce((s, q) => s + q.amount, 0),
      );
      setTotalDebtUSD(
        pending
          .filter((q) => q.currency === "USD")
          .reduce((s, q) => s + q.amount, 0),
      );
    } catch (error) {
      if (!isSessionExpired())
        console.error("Error fetching debt forecast:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDebtForecast().finally(() => setLoading(false));
  }, [fetchDebtForecast]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDebtForecast();
    setRefreshing(false);
  };

  const handlePayPeriod = (month: MonthBucket) => {
    if (month.periodsByCard.length === 0) {
      Alert.alert(
        "Sin período",
        "No hay período de facturación asociado a este mes.",
      );
      return;
    }

    const amountText = [
      month.totalCLP > 0 ? `$${month.totalCLP.toLocaleString("es-CL")}` : "",
      month.totalUSD > 0 ? `US$${month.totalUSD.toLocaleString("es-CL")}` : "",
    ]
      .filter(Boolean)
      .join(" + ");

    Alert.alert(
      "Confirmar Pago",
      `¿Marcar como pagadas las ${month.count} cuotas de ${month.label}?\n\nTotal: ${amountText}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Pagar",
          style: "default",
          onPress: async () => {
            setPaying(month.key);
            try {
              let totalPaid = 0;
              for (const pb of month.periodsByCard) {
                const result = await payBillingPeriod(
                  pb.creditCardId,
                  pb.billingPeriodId,
                );
                totalPaid += result.paidCount;
              }
              Alert.alert("Éxito", `${totalPaid} cuotas marcadas como pagadas`);
              await fetchDebtForecast();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "No se pudo procesar el pago",
              );
            } finally {
              setPaying(null);
            }
          },
        },
      ],
    );
  };

  // Get current billing period label (e.g. "Febrero 2026") to highlight
  const getCurrentPeriodLabel = () => {
    const now = new Date();
    const label = now.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const currentPeriodLabel = getCurrentPeriodLabel();

  // Find max month total for relative bar sizing
  const maxMonthTotal = Math.max(
    ...months.map((m) => m.totalCLP + m.totalUSD * 900),
    1,
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Calculando proyección...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Total Debt Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardHeader}>
            <Ionicons name="trending-up-outline" size={24} color="#DC3545" />
            <Text style={styles.totalCardTitle}>Deuda Total Pendiente</Text>
          </View>
          <View style={styles.totalAmounts}>
            {totalDebtCLP > 0 && (
              <Text style={styles.totalAmount}>
                ${totalDebtCLP.toLocaleString("es-CL")}
              </Text>
            )}
            {totalDebtUSD > 0 && (
              <Text style={[styles.totalAmount, { color: "#0056B3" }]}>
                US${totalDebtUSD.toLocaleString("es-CL")}
              </Text>
            )}
            {totalDebtCLP === 0 && totalDebtUSD === 0 && (
              <Text style={[styles.totalAmount, { color: "#28A745" }]}>
                Sin deuda
              </Text>
            )}
          </View>
          <View style={styles.totalMeta}>
            <Ionicons name="calendar-outline" size={14} color="#868E96" />
            <Text style={styles.totalMetaText}>
              {months.length} {months.length === 1 ? "mes" : "meses"} restantes
            </Text>
            <View style={styles.totalMetaDot} />
            <Ionicons name="layers-outline" size={14} color="#868E96" />
            <Text style={styles.totalMetaText}>
              {months.reduce((s, m) => s + m.count, 0)} cuotas pendientes
            </Text>
          </View>
        </View>

        {/* Monthly Breakdown */}
        {months.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="happy-outline" size={56} color="#28A745" />
            <Text style={styles.emptyTitle}>¡Sin deudas pendientes!</Text>
            <Text style={styles.emptySubtitle}>
              No tienes cuotas pendientes de pago
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Proyección Mensual</Text>
            {months.map((month, index) => {
              const barWidth =
                ((month.totalCLP + month.totalUSD * 900) / maxMonthTotal) * 100;
              const isExpanded = expandedMonth === month.key;
              const isCurrentMonth =
                month.label.toLowerCase() === currentPeriodLabel.toLowerCase();

              return (
                <View key={month.key}>
                  <View
                    style={[
                      styles.monthCard,
                      isCurrentMonth && styles.monthCardCurrent,
                      index === 0 && styles.monthCardFirst,
                    ]}
                  >
                    {/* Month header */}
                    <View style={styles.monthHeader}>
                      <View style={styles.monthHeaderLeft}>
                        {isCurrentMonth && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              ESTE MES
                            </Text>
                          </View>
                        )}
                        <Text style={styles.monthLabel}>{month.label}</Text>
                        <Text style={styles.monthCount}>
                          {month.count} {month.count === 1 ? "cuota" : "cuotas"}
                        </Text>
                      </View>
                      <View style={styles.monthHeaderRight}>
                        {month.totalCLP > 0 && (
                          <Text style={styles.monthAmount}>
                            ${month.totalCLP.toLocaleString("es-CL")}
                          </Text>
                        )}
                        {month.totalUSD > 0 && (
                          <Text style={[styles.monthAmountUSD]}>
                            US${month.totalUSD.toLocaleString("es-CL")}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Bar chart */}
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(barWidth, 3)}%` },
                          isCurrentMonth && styles.barFillCurrent,
                        ]}
                      />
                    </View>

                    {/* Expand/Collapse button */}
                    <View style={styles.monthActions}>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() =>
                          setExpandedMonth(isExpanded ? null : month.key)
                        }
                      >
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color="#007BFF"
                        />
                        <Text style={styles.expandButtonText}>
                          {isExpanded ? "Ocultar" : "Detalle"}
                        </Text>
                      </TouchableOpacity>

                      {month.periodsByCard.length > 0 && (
                        <TouchableOpacity
                          style={[
                            styles.payButton,
                            paying === month.key && { opacity: 0.6 },
                          ]}
                          onPress={() => handlePayPeriod(month)}
                          disabled={paying === month.key}
                        >
                          {paying === month.key ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-done"
                                size={14}
                                color="#fff"
                              />
                              <Text style={styles.payButtonText}>
                                Pagar Período
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Expanded details */}
                    {isExpanded && (
                      <View style={styles.detailsContainer}>
                        {month.details
                          .sort((a, b) => b.amount - a.amount)
                          .map((d, i) => (
                            <TouchableOpacity
                              key={i}
                              style={styles.detailRow}
                              activeOpacity={0.7}
                              onPress={() =>
                                router.push({
                                  pathname: "/(screens)/transactionDetail",
                                  params: {
                                    creditCardId: d.creditCardId,
                                    transactionId: d.transactionId,
                                  },
                                })
                              }
                            >
                              <View style={styles.detailLeft}>
                                <Text
                                  style={styles.detailMerchant}
                                  numberOfLines={1}
                                >
                                  {d.merchant}
                                </Text>
                                <Text style={styles.detailQuota}>
                                  Cuota {d.quotaNumber}/{d.totalQuotas}
                                </Text>
                              </View>
                              <View style={styles.detailRight}>
                                <Text style={styles.detailAmount}>
                                  {formatCurrency(d.amount, d.currency)}
                                </Text>
                                <Ionicons
                                  name="chevron-forward"
                                  size={14}
                                  color="#ADB5BD"
                                />
                              </View>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Cumulative projection */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Acumulado
            </Text>
            <View style={styles.cumulativeCard}>
              {(() => {
                let runningCLP = 0;
                let runningUSD = 0;
                return months.map((month, idx) => {
                  runningCLP += month.totalCLP;
                  runningUSD += month.totalUSD;
                  const progress = ((idx + 1) / months.length) * 100;
                  return (
                    <View key={month.key} style={styles.cumulativeRow}>
                      <View style={styles.cumulativeLeft}>
                        <View
                          style={[
                            styles.cumulativeDot,
                            idx === months.length - 1 &&
                              styles.cumulativeDotLast,
                          ]}
                        />
                        {idx < months.length - 1 && (
                          <View style={styles.cumulativeLine} />
                        )}
                        <Text style={styles.cumulativeMonth}>
                          {month.label}
                        </Text>
                      </View>
                      <View style={styles.cumulativeRight}>
                        <View style={styles.cumulativeBarBg}>
                          <View
                            style={[
                              styles.cumulativeBarFill,
                              { width: `${progress}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.cumulativeAmount}>
                          {runningCLP > 0
                            ? `$${runningCLP.toLocaleString("es-CL")}`
                            : ""}
                          {runningCLP > 0 && runningUSD > 0 ? " + " : ""}
                          {runningUSD > 0
                            ? `US$${runningUSD.toLocaleString("es-CL")}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB - Agregar Deuda */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(screens)/addDebt")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: { marginTop: 12, fontSize: 15, color: "#868E96" },

  // Total debt card
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    elevation: 2,
    shadowColor: "#DC3545",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  totalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  totalCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalAmounts: {
    gap: 4,
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#DC3545",
  },
  totalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  totalMetaText: { fontSize: 12, color: "#868E96" },
  totalMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CED4DA",
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Month card
  monthCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  monthCardCurrent: {
    borderColor: "#007BFF",
    borderWidth: 2,
  },
  monthCardFirst: {},
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  monthHeaderLeft: { flex: 1 },
  monthHeaderRight: { alignItems: "flex-end" },
  currentBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#007BFF",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
  },
  monthCount: {
    fontSize: 12,
    color: "#868E96",
    marginTop: 2,
  },
  monthAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC3545",
  },
  monthAmountUSD: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0056B3",
    marginTop: 2,
  },

  // Bar
  barContainer: {
    height: 6,
    backgroundColor: "#F1F3F5",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FF6B6B",
    borderRadius: 3,
  },
  barFillCurrent: {
    backgroundColor: "#007BFF",
  },

  // Actions row
  monthActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    gap: 8,
  },

  // Expand
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandButtonText: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "600",
  },

  // Pay button
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#28A745",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  // Details
  detailsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  detailLeft: { flex: 1, marginRight: 10 },
  detailMerchant: { fontSize: 13, fontWeight: "600", color: "#212529" },
  detailQuota: { fontSize: 11, color: "#868E96", marginTop: 1 },
  detailAmount: { fontSize: 14, fontWeight: "700", color: "#DC3545" },
  detailRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#28A745",
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 14, color: "#868E96", marginTop: 6 },

  // Cumulative
  cumulativeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cumulativeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cumulativeLeft: {
    width: 110,
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  cumulativeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007BFF",
    marginRight: 8,
    marginTop: 3,
  },
  cumulativeDotLast: {
    backgroundColor: "#28A745",
  },
  cumulativeLine: {
    position: "absolute",
    left: 4,
    top: 14,
    width: 2,
    height: 30,
    backgroundColor: "#E9ECEF",
  },
  cumulativeMonth: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    flex: 1,
  },
  cumulativeRight: {
    flex: 1,
    gap: 4,
  },
  cumulativeBarBg: {
    height: 6,
    backgroundColor: "#F1F3F5",
    borderRadius: 3,
    overflow: "hidden",
  },
  cumulativeBarFill: {
    height: "100%",
    backgroundColor: "#007BFF",
    borderRadius: 3,
  },
  cumulativeAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
