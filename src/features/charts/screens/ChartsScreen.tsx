import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";
import { WebChart } from "@/shared/components/charts/WebChart";
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
import { colors } from "@/shared/theme/colors";
import { glassSurface, glassSubtle } from "@/shared/theme/effects";
import ErrorState from "@/shared/components/ErrorState";

type ChartTab = "monthly" | "categories" | "usd";
const ALL_PERIODS = "__all__";

const screenWidth = Dimensions.get("window").width - 48;

const CHART_COLORS = [
  colors.accent,
  colors.destructive,
  colors.success,
  colors.warning,
  "#06B6D4",
  "#8B5CF6",
  "#F97316",
  "#14B8A6",
  "#EC4899",
  "#6B7280",
  "#2563EB",
  "#B91C1C",
];

const chartConfig = {
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalCount: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: () => colors.textMuted,
  barPercentage: 0.6,
  propsForLabels: {
    fontSize: 11,
    fill: colors.textMuted,
  },
  propsForBackgroundLines: {
    strokeDasharray: "4 4",
    stroke: colors.border,
  },
};

const usdChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
};

export default function ChartsScreen() {
  const [creditCards, setCreditCards] = useState<CreditCardBasic[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [selectedPeriodMonth, setSelectedPeriodMonth] =
    useState<string>(ALL_PERIODS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ChartTab>("monthly");

  const detectCurrentPeriod = useCallback(
    (periods: BillingPeriod[]): string => {
      const now = Date.now();
      const current = periods.find((p) => {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        return now >= start && now <= end;
      });
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
      setError(null);
      const [data, periodsResponse] = await Promise.all([
        getMonthlyStats(selectedCardId),
        getBillingPeriodsByCreditCard(selectedCardId),
      ]);
      setStats(data);
      const periods = periodsResponse.items;
      const sorted = [...periods].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
      setBillingPeriods(sorted);
      setSelectedPeriodMonth(detectCurrentPeriod(sorted));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar los gráficos");
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

  // ── Derived data ─────────────────────────────────────────────────────────

  const selectedStat: MonthlyStat | null =
    selectedPeriodMonth === ALL_PERIODS
      ? null
      : (stats.find((s) => s.month === selectedPeriodMonth) ?? null);

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
      legendFontColor: colors.textMuted,
      legendFontSize: 11,
    }));
  };

  const getSummaryCards = () => {
    const totalCLP = stats.reduce((sum, s) => sum + s.totalCLP, 0);
    const totalUSD = stats.reduce((sum, s) => sum + s.totalUSD, 0);
    const avgCLP = stats.length > 0 ? Math.round(totalCLP / stats.length) : 0;
    const avgUSD =
      stats.length > 0
        ? Math.round((totalUSD / stats.length) * 100) / 100
        : 0;
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

  if (error) {
    return <ErrorState message="No se pudieron cargar los gráficos." onRetry={() => { setError(null); fetchData(); }} />;
  }

  if (loading && creditCards.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* ── Card Selector ───────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        {creditCards.map((card) => {
          const isSelected = selectedCardId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => setSelectedCardId(card.id)}
              style={[
                styles.cardChip,
                isSelected && styles.cardChipActive,
              ]}
              accessibilityLabel={card.cardType}
              accessibilityRole="button"
            >
              <Ionicons
                name="card-outline"
                size={16}
                color={isSelected ? colors.textPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.cardChipText,
                  isSelected && styles.cardChipTextActive,
                ]}
              >
                {card.cardType} •{card.cardLastDigits}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Billing Period Selector ─────────────────────────── */}
      {!loading && billingPeriods.length > 0 && (
        <View style={styles.periodCard}>
          <Text style={styles.periodLabel}>Período de facturación</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            <PeriodChip
              label="Todos"
              isActive={selectedPeriodMonth === ALL_PERIODS}
              onPress={() => setSelectedPeriodMonth(ALL_PERIODS)}
            />
            {[...billingPeriods].reverse().map((p) => {
              const isSelected = selectedPeriodMonth === p.month;
              const now = Date.now();
              const isCurrent =
                now >= new Date(p.startDate).getTime() &&
                now <= new Date(p.endDate).getTime();
              return (
                <PeriodChip
                  key={p.id}
                  label={p.month}
                  isActive={isSelected}
                  isCurrent={isCurrent && !isSelected}
                  onPress={() => setSelectedPeriodMonth(p.month)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Summary Cards ───────────────────────────────────── */}
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
          <Ionicons name="trending-up" size={18} color={colors.accent} />
          <Text style={styles.highlightText}>
            Mes más alto:{" "}
            <Text style={styles.highlightBold}>{maxMonth.month}</Text>
            {" — "}
            {formatCLP(maxMonth.totalCLP)}
          </Text>
        </View>
      )}

      {/* ── Tab Selector ─────────────────────────────────────── */}
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
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                isActive && styles.tabActive,
              ]}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.textPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Charts ──────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 40 }}
        />
      ) : stats.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="analytics-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Sin datos suficientes</Text>
          <Text style={styles.emptySubtitle}>
            Importá transacciones para ver tus gráficos
          </Text>
          <Pressable
            style={styles.emptyCta}
            onPress={onRefresh}
            accessibilityLabel="Sincronizar movimientos"
            accessibilityRole="button"
          >
            <Ionicons name="sync-outline" size={14} color={colors.accent} />
            <Text style={styles.emptyCtaText}>Sincronizar ahora</Text>
          </Pressable>
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
                Platform.OS === "web" ? (
                  <WebChart
                    data={getBarChartData().labels.map((label: string, i: number) => ({
                      label,
                      value: getBarChartData().datasets[0].data[i],
                    }))}
                    type="bar"
                  />
                ) : (
                  <BarChart
                    data={getBarChartData()}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel="$"
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    style={styles.chart}
                    fromZero
                    showValuesOnTopOfBars
                    withVerticalLabels
                    withHorizontalLabels
                  />
                )
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
                      <Pressable
                        key={s.month}
                        onPress={() => setSelectedPeriodMonth(s.month)}
                        style={[
                          styles.breakdownRow,
                          isSelected && styles.breakdownRowSelected,
                        ]}
                        accessibilityLabel={s.month}
                        accessibilityRole="button"
                      >
                        <View style={styles.breakdownMonthRow}>
                          {isSelected && (
                            <View style={styles.breakdownDot} />
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
                            styles.breakdownAmount,
                            isSelected && styles.breakdownAmountSelected,
                          ]}
                        >
                          {formatCLP(s.totalCLP)}
                        </Text>
                      </Pressable>
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
                Platform.OS === "web" ? (
                  <WebChart
                    data={getUsdBarChartData().labels.map((label: string, i: number) => ({
                      label,
                      value: getUsdBarChartData().datasets[0].data[i],
                    }))}
                    type="bar"
                  />
                ) : (
                  <BarChart
                    data={getUsdBarChartData()}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel="US$"
                    yAxisSuffix=""
                    chartConfig={usdChartConfig}
                    style={styles.chart}
                    fromZero
                    showValuesOnTopOfBars
                    withVerticalLabels
                    withHorizontalLabels
                  />
                )
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
                      <Pressable
                        key={s.month}
                        onPress={() => setSelectedPeriodMonth(s.month)}
                        style={[
                          styles.breakdownRow,
                          isSelected && styles.breakdownRowSelected,
                        ]}
                        accessibilityLabel={s.month}
                        accessibilityRole="button"
                      >
                        <View style={styles.breakdownMonthRow}>
                          {isSelected && (
                            <View style={styles.breakdownDot} />
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
                            styles.breakdownUSD,
                            isSelected && styles.breakdownUSDSelected,
                          ]}
                        >
                          US${s.totalUSD.toFixed(2)}
                        </Text>
                      </Pressable>
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
                Platform.OS === "web" ? (
                  <WebChart
                    data={getPieChartData().map((d) => ({
                      name: d.name,
                      value: d.amount,
                      color: d.color,
                    }))}
                    type="pie"
                  />
                ) : (
                  <PieChart
                    data={getPieChartData()}
                    width={screenWidth - 48}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute={false}
                  />
                )
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

// ─── PeriodChip sub-component ──────────────────────────────────────────────

function PeriodChip({
  label,
  isActive,
  isCurrent,
  onPress,
}: {
  label: string;
  isActive: boolean;
  isCurrent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        isActive && chipStyles.chipActive,
        isCurrent && chipStyles.chipCurrent,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {isCurrent && <View style={chipStyles.dot} />}
      <Text
        style={[
          chipStyles.chipText,
          isActive && chipStyles.chipTextActive,
          isCurrent && !isActive && chipStyles.chipTextCurrent,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipCurrent: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  chipTextCurrent: {
    color: colors.accent,
  },
});

// ─── Main styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },

  // ── Card chips ─────────────────────────────────────────
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cardChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cardChipTextActive: {
    color: colors.textPrimary,
  },

  // ── Period selector ────────────────────────────────────
  periodCard: {
    ...glassSurface(false),
    padding: 14,
    marginBottom: 14,
  },
  periodLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── Summary ────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    ...glassSurface(false),
    padding: 14,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 4,
  },
  summaryUsd: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
    marginTop: 2,
  },

  // ── Highlight ─────────────────────────────────────────
  highlightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  highlightText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  highlightBold: {
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // ── Tabs ──────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },

  // ── Chart card ────────────────────────────────────────
  chartCard: {
    ...glassSurface(false),
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
  },
  noDataText: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: 30,
    fontSize: 14,
  },

  // ── Period breakdown ──────────────────────────────────
  breakdownContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 1,
  },
  breakdownRowSelected: {
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  breakdownMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  breakdownMonth: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  breakdownMonthSelected: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  breakdownAmountSelected: {
    fontWeight: "700",
  },
  breakdownUSD: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
  breakdownUSDSelected: {
    fontWeight: "700",
  },

  // ── Category list ─────────────────────────────────────
  categoryList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoryPct: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginRight: 10,
    minWidth: 32,
    textAlign: "right",
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // ── Empty state ───────────────────────────────────────
  emptyCard: {
    ...glassSurface(false),
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  emptyCtaText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
