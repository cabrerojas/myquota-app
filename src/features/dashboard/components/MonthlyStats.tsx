import { View, Text, StyleSheet } from "react-native";
import { memo } from "react";
import { useMonthlyStats } from "../services/statsApi";

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalUSD: number;
}

interface MonthlyStatsProps {
  creditCardId: string;
}

const MonthlyStatsComponent = ({ creditCardId }: MonthlyStatsProps) => {
  const { data: monthlyStats = [], isLoading } = useMonthlyStats(creditCardId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Gastos Mensuales</Text>
        <Text style={styles.loading}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos Mensuales</Text>
      {monthlyStats.map((item) => (
        <View key={item.month} style={styles.row}>
          <Text style={styles.month}>{item.month}</Text>
          <Text style={styles.amountCLP}>
            CLP: ${item.totalCLP.toLocaleString("es-CL")}
          </Text>
          <Text style={styles.amountUSD}>USD: ${item.totalUSD.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(MonthlyStatsComponent);

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  loading: { fontSize: 14, color: "#868E96", fontStyle: "italic" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE2E6",
  },
  month: { fontSize: 16, fontWeight: "bold" },
  amountCLP: { fontSize: 16, color: "#28A745" },
  amountUSD: { fontSize: 16, color: "#007BFF" },
});
