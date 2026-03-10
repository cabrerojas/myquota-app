import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getMonthlyStats } from "../services/statsApi";

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalUSD: number;
}

interface MonthlyStatsProps {
  creditCardId: string;
}

export default function MonthlyStats({ creditCardId }: MonthlyStatsProps) {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);

  useEffect(() => {
    getMonthlyStats(creditCardId).then(setMonthlyStats);
  }, [creditCardId]);

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
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
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
