import { View, Text, StyleSheet } from "react-native";
import { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface, iconContainerSm } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { spacing, typography } from "@/shared/theme/tokens";
import { useMonthlyStats } from "../services/statsApi";

interface MonthlyStatsProps {
  creditCardId: string;
}

const MONTH_NAMES_LONG = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Spanish display name from YYYY-MM key, e.g. "2026-08" → "Agosto 2026". */
function formatMonthDisplay(key: string): string {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [, month] = key.split("-");
    const idx = parseInt(month, 10);
    return `${MONTH_NAMES_LONG[idx]} ${key.slice(0, 4)}`;
  }
  return key;
}

const MonthlyStatsComponent = ({ creditCardId }: MonthlyStatsProps) => {
  const { data: monthlyStats = [], isLoading } = useMonthlyStats(creditCardId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tendencia mensual</Text>
        <Text style={styles.loading}>Cargando...</Text>
      </View>
    );
  }

  const hasData = monthlyStats.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tendencia mensual</Text>
      {hasData ? (
        monthlyStats.slice(0, 4).map((item) => (
          <View key={item.month} style={styles.row}>
            <Text style={styles.month}>{formatMonthDisplay(item.month)}</Text>
            <Text style={styles.amountCLP}>
              ${item.totalCLP.toLocaleString("es-CL")}
            </Text>
            <Text style={styles.amountUSD}>US$ {item.totalUSD.toFixed(2)}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name="bar-chart-outline"
              size={20}
              color={colors.textMuted}
            />
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
    marginTop: spacing.md,
    padding: spacing.md,
  } as any,
  title: {
    ...typography.presets.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm2,
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
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
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
    ...iconContainerSm,
    backgroundColor: colors.borderLight,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
