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
import { getMonthlyStats } from "@/features/dashboard/services/statsApi";

interface CreditCard {
  id: string;
  cardType: string;
  cardLastDigits: string;
}

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalDolar: number;
  categoryBreakdown: {
    [category: string]: { CLP: number; Dolar: number };
  };
}

type ChartTab = "monthly" | "categories" | "usd";

const screenWidth = Dimensions.get("window").width - 32;

const CHART_COLORS = [
  "#007BFF", "#DC3545", "#28A745", "#FFC107", "#17A2B8",
  "#6F42C1", "#FD7E14", "#20C997", "#E83E8C", "#6C757D",
  "#0056B3", "#C82333",
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
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ChartTab>("monthly");

  useEffect(() => {
    getCreditCards().then((cards) => {
      setCreditCards(cards);
      if (cards.length > 0) setSelectedCardId(cards[0].id);
      setLoading(false);
    });
  }, []);

  const fetchStats = useCallback(async () => {
    if (!selectedCardId) return;
    try {
      const data = await getMonthlyStats(selectedCardId);
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [selectedCardId]);

  useEffect(() => {
    if (selectedCardId) {
      setLoading(true);
      fetchStats().finally(() => setLoading(false));
    }
  }, [selectedCardId, fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  // Prepare bar chart data (CLP)
  const getBarChartData = () => {
    const sorted = [...stats].sort((a, b) => {
      // Try to maintain chronological order by month name
      return stats.indexOf(a) - stats.indexOf(b);
    });
    const last6 = sorted.slice(-6);

    return {
      labels: last6.map((s) => {
        // Shorten month name: "Enero 2026" -> "Ene"
        const parts = s.month.split(" ");
        return parts[0].substring(0, 3);
      }),
      datasets: [
        {
          data: last6.map((s) => s.totalCLP || 0),
        },
      ],
    };
  };

  // Prepare bar chart data (USD)
  const getUsdBarChartData = () => {
    const sorted = [...stats].sort((a, b) => {
      return stats.indexOf(a) - stats.indexOf(b);
    });
    const last6 = sorted.slice(-6);

    return {
      labels: last6.map((s) => {
        const parts = s.month.split(" ");
        return parts[0].substring(0, 3);
      }),
      datasets: [
        {
          data: last6.map((s) => s.totalDolar || 0),
        },
      ],
    };
  };

  // Prepare pie chart data (top merchants)
  const getPieChartData = () => {
    const merged: { [cat: string]: number } = {};

    stats.forEach((s) => {
      if (s.categoryBreakdown) {
        Object.entries(s.categoryBreakdown).forEach(([cat, amounts]) => {
          const total = (amounts.CLP || 0) + (amounts.Dolar || 0) * 900;
          merged[cat] = (merged[cat] || 0) + total;
        });
      }
    });

    // Top 8 merchants, rest as "Otros"
    const entries = Object.entries(merged).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);
    const othersTotal = entries.slice(8).reduce((sum, [, v]) => sum + v, 0);
    if (othersTotal > 0) {
      top.push(["Otros", othersTotal]);
    }

    return top.map(([name, amount], idx) => ({
      name: name.length > 15 ? name.substring(0, 14) + "…" : name,
      amount: Math.round(amount),
      color: CHART_COLORS[idx % CHART_COLORS.length],
      legendFontColor: "#495057",
      legendFontSize: 11,
    }));
  };

  // Summary stats
  const getTotals = () => {
    const totalCLP = stats.reduce((sum, s) => sum + s.totalCLP, 0);
    const totalUSD = stats.reduce((sum, s) => sum + s.totalDolar, 0);
    const avgCLP = stats.length > 0 ? Math.round(totalCLP / stats.length) : 0;
    const maxMonth = stats.reduce(
      (max, s) => (s.totalCLP > (max?.totalCLP ?? 0) ? s : max),
      stats[0],
    );
    return { totalCLP, totalUSD, avgCLP, maxMonth };
  };

  const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;

  const totals = getTotals();

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Card Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {creditCards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.cardChip, selectedCardId === card.id && styles.cardChipActive]}
            onPress={() => setSelectedCardId(card.id)}
          >
            <Ionicons
              name="card-outline"
              size={16}
              color={selectedCardId === card.id ? "#fff" : "#495057"}
            />
            <Text
              style={[styles.cardChipText, selectedCardId === card.id && styles.cardChipTextActive]}
            >
              {card.cardType} •{card.cardLastDigits}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary Cards */}
      {!loading && stats.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total acumulado</Text>
            <Text style={styles.summaryValue}>{formatCLP(totals.totalCLP)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Promedio mensual</Text>
            <Text style={styles.summaryValue}>{formatCLP(totals.avgCLP)}</Text>
          </View>
        </View>
      )}

      {totals.maxMonth && !loading && (
        <View style={styles.highlightCard}>
          <Ionicons name="trending-up" size={18} color="#DC3545" />
          <Text style={styles.highlightText}>
            Mes más alto:{" "}
            <Text style={styles.highlightBold}>{totals.maxMonth.month}</Text>
            {" — "}
            {formatCLP(totals.maxMonth.totalCLP)}
          </Text>
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {([
          { key: "monthly" as ChartTab, label: "Mensual CLP", icon: "bar-chart-outline" as const },
          { key: "usd" as ChartTab, label: "Mensual USD", icon: "logo-usd" as const },
          { key: "categories" as ChartTab, label: "Comercios", icon: "pie-chart-outline" as const },
        ]).map((tab) => (
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
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Charts */}
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 40 }} />
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
          {activeTab === "monthly" && (
            <>
              <Text style={styles.chartTitle}>Gastos mensuales (CLP)</Text>
              <Text style={styles.chartSubtitle}>Últimos 6 períodos</Text>
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
                <Text style={styles.noDataText}>No hay gastos CLP en este período</Text>
              )}

              {/* Monthly breakdown */}
              <View style={styles.breakdownContainer}>
                {[...stats].reverse().slice(0, 6).map((s) => (
                  <View key={s.month} style={styles.breakdownRow}>
                    <Text style={styles.breakdownMonth}>{s.month}</Text>
                    <View style={styles.breakdownValues}>
                      <Text style={styles.breakdownCLP}>{formatCLP(s.totalCLP)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === "usd" && (
            <>
              <Text style={styles.chartTitle}>Gastos mensuales (USD)</Text>
              <Text style={styles.chartSubtitle}>Últimos 6 períodos</Text>
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
                <Text style={styles.noDataText}>No hay gastos USD en este período</Text>
              )}

              {/* USD Monthly breakdown */}
              <View style={styles.breakdownContainer}>
                {[...stats].reverse().slice(0, 6).map((s) => (
                  <View key={s.month} style={styles.breakdownRow}>
                    <Text style={styles.breakdownMonth}>{s.month}</Text>
                    <View style={styles.breakdownValues}>
                      <Text style={[styles.breakdownCLP, { color: "#28A745" }]}>
                        US${s.totalDolar.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === "categories" && (
            <>
              <Text style={styles.chartTitle}>Distribución por comercio</Text>
              <Text style={styles.chartSubtitle}>Todos los períodos (CLP equiv.)</Text>
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
                <Text style={styles.noDataText}>No hay datos de categorías</Text>
              )}

              {/* Category list */}
              <View style={styles.categoryList}>
                {getPieChartData().map((cat, idx) => (
                  <View key={idx} style={styles.categoryRow}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Text style={styles.categoryAmount}>{formatCLP(cat.amount)}</Text>
                  </View>
                ))}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },

  // Card chips
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

  // Summary
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  summaryLabel: { fontSize: 11, color: "#868E96", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#212529", marginTop: 4 },

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

  // Tabs
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

  // Chart card
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#212529" },
  chartSubtitle: { fontSize: 12, color: "#868E96", marginTop: 2, marginBottom: 14 },
  chart: { borderRadius: 10, marginVertical: 8 },
  noDataText: { textAlign: "center", color: "#868E96", paddingVertical: 30, fontSize: 14 },

  // Breakdown
  breakdownContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#F1F3F5", paddingTop: 12 },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  breakdownMonth: { fontSize: 13, fontWeight: "500", color: "#495057" },
  breakdownValues: { flexDirection: "row", gap: 12 },
  breakdownCLP: { fontSize: 13, fontWeight: "600", color: "#007BFF" },

  // Categories
  categoryList: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#F1F3F5", paddingTop: 12 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { flex: 1, fontSize: 13, color: "#495057" },
  categoryAmount: { fontSize: 13, fontWeight: "600", color: "#212529" },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#495057", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#868E96", marginTop: 6, textAlign: "center" },
});
