import { View, Text, StyleSheet } from "react-native";
import { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { useMonthlyStats } from "../services/statsApi";

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

  const hasData = monthlyStats.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos Mensuales</Text>
      {hasData ? (
        monthlyStats.map((item) => (
          <View key={item.month} style={styles.row}>
            <Text style={styles.month}>{item.month}</Text>
            <Text style={styles.amountCLP}>
              CLP: ${item.totalCLP.toLocaleString("es-CL")}
            </Text>
            <Text style={styles.amountUSD}>
              USD: ${item.totalUSD.toFixed(2)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>
            Los gastos mensuales aparecerán cuando importe movimientos
          </Text>
        </View>
      )}
    </View>
  );
};

export default memo(MonthlyStatsComponent);

const styles = StyleSheet.create({
  container: {
    ...glassSurface(false),
    marginTop: 16,
  } as any,
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loading: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  month: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  amountCLP: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  amountUSD: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.accent,
    marginLeft: 12,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  emptyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
