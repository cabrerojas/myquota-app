import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  getMonthlyStats,
  MonthlyStat,
} from "@/features/dashboard/services/statsApi";
import {
  getBillingPeriodsByCreditCard,
  BillingPeriod,
} from "@/features/billingPeriods/services/billingPeriodsApi";
import { CreditCardBasic } from "@/shared/types/creditCard";
import { isSessionExpired } from "@/shared/utils/authEvents";

type ChartTab = "monthly" | "categories" | "usd";
const ALL_PERIODS = "__all__";

const screenWidth = Dimensions.get("window").width - 32;

const CHART_COLORS = [
  "#007BFF",
  "#DC3545",
  "#28A745",
  "#FFC107",
  "#17A2B8",
  "#6F42C1",
  "#FD7E14",
  "#20C997",
  "#E83E8C",
  "#6C757D",
  "#0056B3",
  "#C82333",
];

const chartConfig = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalCount: 0,
  color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
  labelColor: () => "#868E96",
  barPercentage: 0.6,
  propsForLabels: {
    fontSize: 11,
  },
  propsForBackgroundLines: {
    strokeDasharray: "4 4",
    stroke: "#E9ECEF",
  },
};

const usdChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
};

export default function ChartsScreen() {
  const [creditCards, setCreditCards] = useState<CreditCardBasic[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [selectedPeriodMonth, setSelectedPeriodMonth] =
    useState<string>(ALL_PERIODS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ChartTab>("monthly");

  // Detect the current billing period (today falls between startDate and endDate)
  const detectCurrentPeriod = useCallback(
    (periods: BillingPeriod[]): string => {
      const now = Date.now();
      const current = periods.find((p) => {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        return now >= start && now <= end;
      });
      // If found, use its month; otherwise fall back to the most recent period
      if (current) return current.month;
      const sorted = [...periods].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
      return sorted[0]?.month ?? ALL_PERIODS;
    },
    [],
  );

  useEffect(() => {
    getCreditCards().then((cardsResponse) => {
      const cards = cardsResponse.items;
      setCreditCards(cards);
      if (cards.length > 0) setSelectedCardId(cards[0].id);
      setLoading(false);
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCardId) return;
    try {
      const [data, periodsResponse] = await Promise.all([
        getMonthlyStats(selectedCardId),
        getBillingPeriodsByCreditCard(selectedCardId),
      ]);
      setStats(data);
      const periods = periodsResponse.items;
      // Sort periods chronologically (oldest → newest)
      const sorted = [...periods].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
      setBillingPeriods(sorted);
      setSelectedPeriodMonth(detectCurrentPeriod(sorted));
    } catch (error) {
      if (!isSessionExpired())
        console.error("Error fetching chart data:", error);
    }
  }, [selectedCardId, detectCurrentPeriod]);

  useEffect(() => {
    if (selectedCardId) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [selectedCardId, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── Derived data helpers ────────────────────────────────────────────────────

  // The MonthlyStat entry for the selected billing period (or null if "Todos")
  const selectedStat: MonthlyStat | null =
    selectedPeriodMonth === ALL_PERIODS
      ? null
      : (stats.find((s) => s.month === selectedPeriodMonth) ?? null);

  // Stats to use for bar charts (always all periods for trend context)
  const getBarChartData = () => {
    const last6 = stats.slice(-6);
    return {
      labels: last6.map((s) => s.month.split(" ")[0].substring(0, 3)),
      datasets: [{ data: last6.map((s) => s.totalCLP || 0) }],
    };
  };

  const getUsdBarChartData = () => {
    const last6 = stats.slice(-6);
    return {
      labels: last6.map((s) => s.month.split(" ")[0].substring(0, 3)),
      datasets: [{ data: last6.map((s) => s.totalUSD || 0) }],
    };
  };

  // Pie: use selected period's breakdown, or merge all periods when "Todos"
  const getPieChartData = () => {
    const merged: { [cat: string]: number } = {};
    const source = selectedStat ? [selectedStat] : stats;

    source.forEach((s) => {
      if (s.categoryBreakdown) {
        Object.entries(s.categoryBreakdown).forEach(([cat, amounts]) => {
          const total = (amounts.CLP || 0) + (amounts.USD || 0) * 900;
          merged[cat] = (merged[cat] || 0) + total;
        });
      }
    });

    const entries = Object.entries(merged).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);
    const othersTotal = entries.slice(8).reduce((sum, [, v]) => sum + v, 0);
    if (othersTotal > 0) top.push(["Otros", othersTotal]);

    return top.map(([name, amount], idx) => ({
      name: name.length > 15 ? name.substring(0, 14) + "…" : name,
      fullName: name,
      amount: Math.round(amount),
      color: CHART_COLORS[idx % CHART_COLORS.length],
      legendFontColor: "#495057",
      legendFontSize: 11,
    }));
  };

  // Summary: selected period vs all-time
  const getSummaryCards = () => {
    const totalCLP = stats.reduce((sum, s) => sum + s.totalCLP, 0);
    const totalUSD = stats.reduce((sum, s) => sum + s.totalUSD, 0);
    const avgCLP = stats.length > 0 ? Math.round(totalCLP / stats.length) : 0;
    const avgUSD =
      stats.length > 0 ? Math.round((totalUSD / stats.length) * 100) / 100 : 0;
    if (selectedStat) {
      return {
        label1: "Gasto del período",
        value1: selectedStat.totalCLP,
        usd1: selectedStat.totalUSD,
        label2: "Promedio mensual",
        value2: avgCLP,
        usd2: avgUSD,
      };
    }
    return {
      label1: "Total acumulado",
      value1: totalCLP,
      usd1: totalUSD,
      label2: "Promedio mensual",
      value2: avgCLP,
      usd2: avgUSD,
    };
  };

  const maxMonth =
    stats.length > 0
      ? stats.reduce(
          (max, s) => (s.totalCLP > (max?.totalCLP ?? 0) ? s : max),
          stats[0],
        )
      : null;

  const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;
  const summary = getSummaryCards();

  if (loading && creditCards.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ── Card Selector ─────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        {creditCards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.cardChip,
              selectedCardId === card.id && styles.cardChipActive,
            ]}
            onPress={() => setSelectedCardId(card.id)}
          >
            <Ionicons
              name="card-outline"
              size={16}
              color={selectedCardId === card.id ? "#fff" : "#495057"}
            />
            <Text
              style={[
                styles.cardChipText,
                selectedCardId === card.id && styles.cardChipTextActive,
              ]}
            >
              {card.cardType} •{card.cardLastDigits}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Billing Period Selector ────────────────────────────────── */}
      {!loading && billingPeriods.length > 0 && (
        <View style={styles.periodSelectorWrapper}>
          <Text style={styles.periodSelectorLabel}>Período de facturación</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 6 }}
          >
            {/* "Todos" chip */}
            <TouchableOpacity
              style={[
                styles.periodChip,
                selectedPeriodMonth === ALL_PERIODS && styles.periodChipActive,
              ]}
              onPress={() => setSelectedPeriodMonth(ALL_PERIODS)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selectedPeriodMonth === ALL_PERIODS &&
                    styles.periodChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>

            {/* One chip per billing period (newest last = scroll right for latest) */}
            {[...billingPeriods].reverse().map((p) => {
              const isSelected = selectedPeriodMonth === p.month;
              // Detect if this is the "current" period
              const now = Date.now();
              const isCurrent =
                now >= new Date(p.startDate).getTime() &&
                now <= new Date(p.endDate).getTime();
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.periodChip,
                    isSelected && styles.periodChipActive,
                    isCurrent &&
                      !isSelected &&
                      styles.periodChipCurrentUnselected,
                  ]}
                  onPress={() => setSelectedPeriodMonth(p.month)}
                >
                  {isCurrent && <View style={styles.periodChipDot} />}
                  <Text
                    style={[
                      styles.periodChipText,
                      isSelected && styles.periodChipTextActive,
                      isCurrent && !isSelected && styles.periodChipTextCurrent,
                    ]}
                  >
                    {p.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      {!loading && stats.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{summary.label1}</Text>
            <Text style={styles.summaryValue}>{formatCLP(summary.value1)}</Text>
            {summary.usd1 > 0 && (
              <Text style={styles.summaryUsd}>
                US$
                {summary.usd1.toLocaleString("es-CL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{summary.label2}</Text>
            <Text style={styles.summaryValue}>{formatCLP(summary.value2)}</Text>
            {summary.usd2 > 0 && (
              <Text style={styles.summaryUsd}>
                US$
                {summary.usd2.toLocaleString("es-CL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>
        </View>
      )}

      {maxMonth && !loading && selectedPeriodMonth === ALL_PERIODS && (
        <View style={styles.highlightCard}>
          <Ionicons name="trending-up" size={18} color="#DC3545" />
          <Text style={styles.highlightText}>
            Mes más alto:{" "}
            <Text style={styles.highlightBold}>{maxMonth.month}</Text>
            {" — "}
            {formatCLP(maxMonth.totalCLP)}
          </Text>
        </View>
      )}

      {/* ── Tab Selector ──────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {[
          {
            key: "monthly" as ChartTab,
            label: "Mensual CLP",
            icon: "bar-chart-outline" as const,
          },
          {
            key: "usd" as ChartTab,
            label: "Mensual USD",
            icon: "logo-usd" as const,
          },
          {
            key: "categories" as ChartTab,
            label: "Categorías",
            icon: "pie-chart-outline" as const,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#fff" : "#495057"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Charts ────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007BFF"
          style={{ marginTop: 40 }}
        />
      ) : stats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={56} color="#CED4DA" />
          <Text style={styles.emptyTitle}>Sin datos suficientes</Text>
          <Text style={styles.emptySubtitle}>
            Importa transacciones para ver tus gráficos
          </Text>
        </View>
      ) : (
        <View style={styles.chartCard}>
          {/* ── Mensual CLP ── */}
          {activeTab === "monthly" && (
            <>
              <Text style={styles.chartTitle}>Gastos mensuales (CLP)</Text>
              <Text style={styles.chartSubtitle}>
                Últimos {Math.min(stats.length, 6)} períodos
              </Text>
              {getBarChartData().datasets[0].data.some((v) => v > 0) ? (
                <BarChart
                  data={getBarChartData()}
                  width={screenWidth - 32}
                  height={220}
                  yAxisLabel="$"
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                />
              ) : (
                <Text style={styles.noDataText}>
                  No hay gastos CLP en este período
                </Text>
              )}

              <View style={styles.breakdownContainer}>
                {[...stats]
                  .reverse()
                  .slice(0, 6)
                  .map((s) => {
                    const isSelected =
                      selectedPeriodMonth !== ALL_PERIODS &&
                      s.month === selectedPeriodMonth;
                    return (
                      <TouchableOpacity
                        key={s.month}
                        style={[
                          styles.breakdownRow,
                          isSelected && styles.breakdownRowSelected,
                        ]}
                        onPress={() => setSelectedPeriodMonth(s.month)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.breakdownMonthRow}>
                          {isSelected && (
                            <View style={styles.breakdownSelectedDot} />
                          )}
                          <Text
                            style={[
                              styles.breakdownMonth,
                              isSelected && styles.breakdownMonthSelected,
                            ]}
                          >
                            {s.month}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.breakdownCLP,
                            isSelected && styles.breakdownCLPSelected,
                          ]}
                        >
                          {formatCLP(s.totalCLP)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </>
          )}

          {/* ── Mensual USD ── */}
          {activeTab === "usd" && (
            <>
              <Text style={styles.chartTitle}>Gastos mensuales (USD)</Text>
              <Text style={styles.chartSubtitle}>
                Últimos {Math.min(stats.length, 6)} períodos
              </Text>
              {getUsdBarChartData().datasets[0].data.some((v) => v > 0) ? (
                <BarChart
                  data={getUsdBarChartData()}
                  width={screenWidth - 32}
                  height={220}
                  yAxisLabel="US$"
                  yAxisSuffix=""
                  chartConfig={usdChartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                />
              ) : (
                <Text style={styles.noDataText}>
                  No hay gastos USD en este período
                </Text>
              )}

              <View style={styles.breakdownContainer}>
                {[...stats]
                  .reverse()
                  .slice(0, 6)
                  .map((s) => {
                    const isSelected =
                      selectedPeriodMonth !== ALL_PERIODS &&
                      s.month === selectedPeriodMonth;
                    return (
                      <TouchableOpacity
                        key={s.month}
                        style={[
                          styles.breakdownRow,
                          isSelected && styles.breakdownRowSelected,
                        ]}
                        onPress={() => setSelectedPeriodMonth(s.month)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.breakdownMonthRow}>
                          {isSelected && (
                            <View style={styles.breakdownSelectedDot} />
                          )}
                          <Text
                            style={[
                              styles.breakdownMonth,
                              isSelected && styles.breakdownMonthSelected,
                            ]}
                          >
                            {s.month}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.breakdownCLP,
                            isSelected && {
                              color: "#28A745",
                              fontWeight: "700",
                            },
                          ]}
                        >
                          US${s.totalUSD.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </>
          )}

          {/* ── Categorías ── */}
          {activeTab === "categories" && (
            <>
              <Text style={styles.chartTitle}>Distribución por categoría</Text>
              <Text style={styles.chartSubtitle}>
                {selectedPeriodMonth === ALL_PERIODS
                  ? "Todos los períodos (CLP equiv.)"
                  : `${selectedPeriodMonth} (CLP equiv.)`}
              </Text>
              {getPieChartData().length > 0 ? (
                <PieChart
                  data={getPieChartData()}
                  width={screenWidth - 32}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute={false}
                />
              ) : (
                <Text style={styles.noDataText}>
                  Sin categorías en este período
                </Text>
              )}

              <View style={styles.categoryList}>
                {getPieChartData().map((cat, idx) => {
                  const grandTotal = getPieChartData().reduce(
                    (s, c) => s + c.amount,
                    0,
                  );
                  const pct =
                    grandTotal > 0
                      ? Math.round((cat.amount / grandTotal) * 100)
                      : 0;
                  return (
                    <View key={idx} style={styles.categoryRow}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: cat.color },
                        ]}
                      />
                      <Text style={styles.categoryName}>{cat.fullName}</Text>
                      <Text style={styles.categoryPct}>{pct}%</Text>
                      <Text style={styles.categoryAmount}>
                        {formatCLP(cat.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
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

  // ── Card chips ──────────────────────────────────────────────────
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cardChipActive: { backgroundColor: "#007BFF", borderColor: "#007BFF" },
  cardChipText: { fontSize: 13, fontWeight: "600", color: "#495057" },
  cardChipTextActive: { color: "#fff" },

  // ── Billing period selector ──────────────────────────────────────
  periodSelectorWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  periodSelectorLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  periodChipActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  periodChipCurrentUnselected: {
    borderColor: "#007BFF",
    borderWidth: 1.5,
  },
  periodChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#007BFF",
  },
  periodChipText: { fontSize: 12, fontWeight: "600", color: "#495057" },
  periodChipTextActive: { color: "#fff" },
  periodChipTextCurrent: { color: "#007BFF" },

  // ── Summary ─────────────────────────────────────────────────────
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginTop: 4,
  },
  summaryUsd: {
    fontSize: 12,
    color: "#28A745",
    fontWeight: "600",
    marginTop: 2,
  },
  summarySmall: { fontSize: 14, fontWeight: "400", color: "#868E96" },

  highlightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF3F3",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  highlightText: { fontSize: 13, color: "#495057", flex: 1 },
  highlightBold: { fontWeight: "700" },

  // ── Tabs ────────────────────────────────────────────────────────
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  tabActive: { backgroundColor: "#007BFF", borderColor: "#007BFF" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#495057" },
  tabTextActive: { color: "#fff" },

  // ── Chart card ──────────────────────────────────────────────────
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#212529" },
  chartSubtitle: {
    fontSize: 12,
    color: "#868E96",
    marginTop: 2,
    marginBottom: 14,
  },
  chart: { borderRadius: 10, marginVertical: 8 },
  noDataText: {
    textAlign: "center",
    color: "#868E96",
    paddingVertical: 30,
    fontSize: 14,
  },

  // ── Period breakdown list ────────────────────────────────────────
  breakdownContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 1,
  },
  breakdownRowSelected: {
    backgroundColor: "#EBF4FF",
  },
  breakdownMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#007BFF",
  },
  breakdownMonth: { fontSize: 13, fontWeight: "500", color: "#495057" },
  breakdownMonthSelected: { fontWeight: "700", color: "#212529" },
  breakdownCLP: { fontSize: 13, fontWeight: "600", color: "#007BFF" },
  breakdownCLPSelected: { fontWeight: "700" },

  // ── Category list ────────────────────────────────────────────────
  categoryList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { flex: 1, fontSize: 13, color: "#495057" },
  categoryPct: {
    fontSize: 12,
    fontWeight: "600",
    color: "#868E96",
    marginRight: 10,
    minWidth: 32,
    textAlign: "right",
  },
  categoryAmount: { fontSize: 13, fontWeight: "700", color: "#212529" },

  // ── Empty ────────────────────────────────────────────────────────
  emptyContainer: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#495057",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#868E96",
    marginTop: 6,
    textAlign: "center",
  },
});
