import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import {
  getQuotasByTransaction,
  Quota,
} from "@/features/quotas/services/quotasApi";

interface CreditCard {
  id: string;
  cardType: string;
  cardLastDigits: string;
}

interface MonthBucket {
  key: string; // "2025-07"
  label: string; // "Jul 2025"
  totalCLP: number;
  totalUSD: number;
  count: number;
  details: { merchant: string; amount: number; currency: string; quotaNumber: number; totalQuotas: number }[];
}

interface QuotaEnriched extends Quota {
  merchant: string;
  creditCardLabel: string;
  quotaNumber: number;
  totalQuotas: number;
}

export default function DebtForecastScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [totalDebtCLP, setTotalDebtCLP] = useState(0);
  const [totalDebtUSD, setTotalDebtUSD] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchDebtForecast = useCallback(async () => {
    try {
      const cards = await getCreditCards();
      const allQuotas: QuotaEnriched[] = [];

      // Fetch all quotas across all cards
      for (const card of cards) {
        const txs = await getTransactionsByCreditCard(card.id);
        const results = await Promise.all(
          txs.map(async (tx) => {
            const quotas = await getQuotasByTransaction(card.id, tx.id);
            const sorted = [...quotas].sort(
              (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
            );
            return sorted.map((q, idx) => ({
              ...q,
              merchant: tx.merchant,
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

      // Group by month
      const bucketMap = new Map<string, MonthBucket>();
      for (const q of pending) {
        const date = new Date(q.due_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!bucketMap.has(key)) {
          const label = date.toLocaleDateString("es-CL", {
            month: "long",
            year: "numeric",
            timeZone: "America/Santiago",
          });
          bucketMap.set(key, {
            key,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            totalCLP: 0,
            totalUSD: 0,
            count: 0,
            details: [],
          });
        }
        const bucket = bucketMap.get(key)!;
        if (q.currency === "Dolar") {
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
        });
      }

      // Sort by month key
      const sorted = Array.from(bucketMap.values()).sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      setMonths(sorted);

      // Totals
      setTotalDebtCLP(pending.filter((q) => q.currency !== "Dolar").reduce((s, q) => s + q.amount, 0));
      setTotalDebtUSD(pending.filter((q) => q.currency === "Dolar").reduce((s, q) => s + q.amount, 0));
    } catch (error) {
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

  const formatCurrency = (amount: number, currency: string) => {
    const prefix = currency === "Dolar" ? "US$" : "$";
    return `${prefix}${amount.toLocaleString("es-CL")}`;
  };

  // Find max month total for relative bar sizing
  const maxMonthTotal = Math.max(...months.map((m) => m.totalCLP + m.totalUSD * 900), 1);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Calculando proyección...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Total Debt Card */}
      <View style={styles.totalCard}>
        <View style={styles.totalCardHeader}>
          <Ionicons name="trending-up-outline" size={24} color="#DC3545" />
          <Text style={styles.totalCardTitle}>Deuda Total Pendiente</Text>
        </View>
        <View style={styles.totalAmounts}>
          {totalDebtCLP > 0 && (
            <Text style={styles.totalAmount}>${totalDebtCLP.toLocaleString("es-CL")}</Text>
          )}
          {totalDebtUSD > 0 && (
            <Text style={[styles.totalAmount, { color: "#0056B3" }]}>
              US${totalDebtUSD.toLocaleString("es-CL")}
            </Text>
          )}
          {totalDebtCLP === 0 && totalDebtUSD === 0 && (
            <Text style={[styles.totalAmount, { color: "#28A745" }]}>Sin deuda</Text>
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
          <Text style={styles.emptySubtitle}>No tienes cuotas pendientes de pago</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Proyección Mensual</Text>
          {months.map((month, index) => {
            const barWidth = ((month.totalCLP + month.totalUSD * 900) / maxMonthTotal) * 100;
            const isExpanded = expandedMonth === month.key;
            const isCurrentMonth = (() => {
              const now = new Date();
              const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              return month.key === currentKey;
            })();

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
                          <Text style={styles.currentBadgeText}>ESTE MES</Text>
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
                  <View
                    style={styles.expandButton}
                  >
                    <Text
                      style={styles.expandButtonText}
                      onPress={() => setExpandedMonth(isExpanded ? null : month.key)}
                    >
                      {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#007BFF"
                    />
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {month.details
                        .sort((a, b) => b.amount - a.amount)
                        .map((d, i) => (
                          <View key={i} style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                              <Text style={styles.detailMerchant} numberOfLines={1}>
                                {d.merchant}
                              </Text>
                              <Text style={styles.detailQuota}>
                                Cuota {d.quotaNumber}/{d.totalQuotas}
                              </Text>
                            </View>
                            <Text style={styles.detailAmount}>
                              {formatCurrency(d.amount, d.currency)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Cumulative projection */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Acumulado</Text>
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
                          idx === months.length - 1 && styles.cumulativeDotLast,
                        ]}
                      />
                      {idx < months.length - 1 && <View style={styles.cumulativeLine} />}
                      <Text style={styles.cumulativeMonth}>{month.label}</Text>
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
                        {runningCLP > 0 ? `$${runningCLP.toLocaleString("es-CL")}` : ""}
                        {runningCLP > 0 && runningUSD > 0 ? " + " : ""}
                        {runningUSD > 0 ? `US$${runningUSD.toLocaleString("es-CL")}` : ""}
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
  );
}

const styles = StyleSheet.create({
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

  // Expand
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  expandButtonText: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "600",
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

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#28A745", marginTop: 16 },
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
});
