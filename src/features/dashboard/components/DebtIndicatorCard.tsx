import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { glassSurface } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import type { DebtSummary } from "@/features/dashboard/services/statsApi";

interface DebtIndicatorCardProps {
  refreshKey?: number;
  summary?: DebtSummary;
}

const formatMonthLabel = (month: string): string => {
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-");
    const date = new Date(Number(year), Number(m) - 1, 1);
    const label = date.toLocaleDateString("es-CL", {
      month: "short",
      year: "numeric",
      timeZone: "America/Santiago",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
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
  const next3 = hasData ? (summary!.monthlyBreakdown ?? []).slice(0, 3) : [];
  const maxCLP = next3.length > 0 ? Math.max(...next3.map((m) => m.CLP), 1) : 1;
  const extraMonths = hasData ? Math.max(0, summary!.monthsRemaining - next3.length) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push("/(drawer)/debtForecast")}
      activeOpacity={0.7}
    >
      {/* Subtle gradient decoration */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height={120} style={StyleSheet.absoluteFill}>
          <Circle cx={40} cy={30} r={80} fill={colors.accent} opacity={0.05} />
          <Circle cx={200} cy={-20} r={100} fill={colors.accent} opacity={0.04} />
        </Svg>
      </View>

      <View style={styles.header}>
        <View style={[styles.iconCircle, !hasData && { backgroundColor: colors.borderLight }]}>
          <Ionicons name="calendar-outline" size={18} color={hasData ? colors.accent : colors.textMuted} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Proyección de Deuda</Text>
          {hasData ? (
            <Text style={styles.subtitle}>
              {summary!.pendingCount} cuotas en {summary!.monthsRemaining}{" "}
              {summary!.monthsRemaining === 1 ? "período" : "períodos"}
            </Text>
          ) : (
            <Text style={styles.subtitle}>Aparecerá cuando tengas cuotas pendientes</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>

      {hasData && (
        <View style={styles.monthList}>
          {next3.map((m, i) => {
            const barPct = Math.max((m.CLP / maxCLP) * 100, 3);
            const isFirst = i === 0;
            return (
              <View key={m.month} style={styles.monthRow}>
                <View style={styles.monthLeft}>
                  <View style={styles.monthLabelRow}>
                    {isFirst && (
                      <View style={styles.nowChip}>
                        <Text style={styles.nowChipText}>HOY</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.monthName,
                        isFirst && styles.monthNameCurrent,
                      ]}
                    >
                      {formatMonthLabel(m.month)}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${barPct}%` },
                        isFirst ? styles.barCurrent : styles.barFuture,
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.monthRight}>
                  {m.CLP > 0 && (
                    <Text
                      style={[
                        styles.monthCLP,
                        isFirst ? styles.monthCLPCurrent : styles.monthCLPFuture,
                      ]}
                    >
                      ${m.CLP.toLocaleString("es-CL")}
                    </Text>
                  )}
                  {m.USD > 0 && (
                    <Text style={styles.monthUSD}>
                      US${m.USD.toLocaleString("es-CL")}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {extraMonths > 0 && (
            <Text style={styles.moreMonths}>
              + {extraMonths} {extraMonths === 1 ? "período más" : "períodos más"} →
            </Text>
          )}
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
          {!hasData && (
            <Text style={styles.footerEmpty}>$0</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glassSurface(true),
    marginTop: 16,
  } as any,
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  monthList: { gap: 10, marginTop: 14 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthLeft: { flex: 1, gap: 5 },
  monthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nowChip: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  nowChipText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  monthName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  monthNameCurrent: {
    color: colors.accent,
    fontWeight: "700",
  },
  barTrack: {
    height: 5,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barCurrent: { backgroundColor: colors.accent },
  barFuture: { backgroundColor: colors.textSubtle },
  monthRight: {
    alignItems: "flex-end",
    minWidth: 110,
  },
  monthCLP: { fontSize: 15, fontWeight: "700" },
  monthCLPCurrent: { color: colors.accent },
  monthCLPFuture: { color: colors.textMuted },
  monthUSD: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
    marginTop: 1,
  },
  moreMonths: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 2,
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
});
