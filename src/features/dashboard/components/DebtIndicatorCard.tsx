import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface, iconContainerSm } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { borderRadius, spacing } from "@/shared/theme/tokens";
import type { DebtSummary } from "@/features/dashboard/services/statsApi";

interface DebtIndicatorCardProps {
  refreshKey?: number;
  summary?: DebtSummary;
}

const MONTH_NAMES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatMonthLabel = (month: string): string => {
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [, m] = month.split("-");
    const idx = parseInt(m, 10);
    return `${MONTH_NAMES[idx]} ${month.slice(0, 4)}`;
  }
  return month.replace(
    /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)/,
    (m) => m.slice(0, 3),
  );
};

export default function DebtIndicatorCard({
  refreshKey: _refreshKey,
  summary,
}: DebtIndicatorCardProps) {
  const router = useRouter();
  const hasData = !!summary && (summary.totalCLP > 0 || summary.totalUSD > 0);
  const nextPeriod = hasData ? summary!.monthlyBreakdown?.[0] : undefined;
  const progressCurrency = (summary?.totalCLP ?? 0) > 0 ? "CLP" : "USD";
  const nextPeriodAmount =
    progressCurrency === "CLP"
      ? (nextPeriod?.CLP ?? 0)
      : (nextPeriod?.USD ?? 0);
  const pendingAmount =
    progressCurrency === "CLP"
      ? (summary?.totalCLP ?? 0)
      : (summary?.totalUSD ?? 0);
  const nextProgress =
    pendingAmount > 0
      ? Math.min(Math.max((nextPeriodAmount / pendingAmount) * 100, 0), 100)
      : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push("/(tabs)/proyecciones" as any)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        hasData
          ? `Próximo pago ${nextPeriod ? formatMonthLabel(nextPeriod.month) : ""}. Ver proyección completa`
          : "Ver proyección completa de deuda"
      }
      hitSlop={4}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            !hasData && { backgroundColor: colors.borderLight },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={hasData ? colors.accent : colors.textMuted}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Próximo pago</Text>
          {hasData ? (
            <Text style={styles.subtitle}>
              {summary!.pendingCount} cuotas en {summary!.monthsRemaining}{" "}
              {summary!.monthsRemaining === 1 ? "período" : "períodos"}
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Aparecerá cuando tengas cuotas pendientes
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>

      {hasData && nextPeriod && (
        <View style={styles.nextPayment}>
          <View style={styles.nextPaymentHeader}>
            <Text style={styles.monthNameCurrent}>
              {formatMonthLabel(nextPeriod.month)}
            </Text>
            <View style={styles.monthRight}>
              {nextPeriod.CLP > 0 && (
                <Text style={styles.monthCLPCurrent}>
                  ${nextPeriod.CLP.toLocaleString("es-CL")}
                </Text>
              )}
              {nextPeriod.USD > 0 && (
                <Text style={styles.monthUSD}>
                  US${nextPeriod.USD.toLocaleString("es-CL")}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${nextProgress}%` }]} />
          </View>
          <Text style={styles.periodContext}>
            Proporción del total pendiente en {progressCurrency}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Total pendiente</Text>
        <View style={styles.footerAmounts}>
          {hasData && summary!.totalCLP > 0 && (
            <Text style={styles.footerCLP}>
              ${summary!.totalCLP.toLocaleString("es-CL")}
            </Text>
          )}
          {hasData && summary!.totalUSD > 0 && (
            <Text style={styles.footerUSD}>
              US${summary!.totalUSD.toLocaleString("es-CL")}
            </Text>
          )}
          {!hasData && <Text style={styles.footerEmpty}>$0</Text>}
        </View>
      </View>
      <View style={styles.forecastLink}>
        <Text style={styles.forecastLinkText}>Ver proyección completa</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glassSurface(false),
    marginTop: spacing.md,
    padding: spacing.md,
  } as any,
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    ...iconContainerSm,
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  nextPayment: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  nextPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthNameCurrent: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  periodContext: { fontSize: 12, color: colors.textSecondary },
  monthRight: {
    alignItems: "flex-end",
    minWidth: 110,
  },
  monthCLP: { fontSize: 15, fontWeight: "700" },
  monthCLPCurrent: { color: colors.accent },
  monthUSD: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
    marginTop: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  footerAmounts: {
    alignItems: "flex-end",
    gap: 2,
  },
  footerCLP: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  footerUSD: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  footerEmpty: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSubtle,
  },
  forecastLink: {
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  forecastLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
