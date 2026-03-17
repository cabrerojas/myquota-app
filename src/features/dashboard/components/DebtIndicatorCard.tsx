import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDebtSummary,
  DebtSummary,
} from "@/features/dashboard/services/statsApi";
import { isSessionExpired } from "@/shared/utils/authEvents";
import { colors, borderRadius, fontSizes } from "@/shared/theme/tokens";

interface DebtIndicatorCardProps {
  refreshKey?: number;
  /** If provided, skips the internal API fetch (reuse data from parent). */
  summary?: DebtSummary;
}

/** Converts "2026-03" fallback keys → "Mar 2026". Named months pass through shortened. */
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
  // "Marzo 2026" → "Mar 2026"
  return month.replace(
    /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)/,
    (m) => m.slice(0, 3),
  );
};

export default function DebtIndicatorCard({
  refreshKey,
  summary: summaryProp,
}: DebtIndicatorCardProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<DebtSummary | null>(
    summaryProp ?? null,
  );
  const [loading, setLoading] = useState(!summaryProp);

  useEffect(() => {
    if (summaryProp) {
      setSummary(summaryProp);
      setLoading(false);
      return;
    }
    fetchData();
  }, [refreshKey, summaryProp]);

  const fetchData = async () => {
    try {
      const data = await getDebtSummary();
      setSummary(data);
    } catch (error) {
      if (!isSessionExpired())
        console.error("Error fetching debt summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (
    loading ||
    !summary ||
    (summary.totalCLP === 0 && summary.totalUSD === 0)
  ) {
    return null;
  }

  // Show next 3 upcoming periods (current + next 2)
  const next3 = (summary.monthlyBreakdown ?? []).slice(0, 3);
  const maxCLP = Math.max(...next3.map((m) => m.CLP), 1);
  const extraMonths = Math.max(0, summary.monthsRemaining - next3.length);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push("/(drawer)/debtForecast")}
      activeOpacity={0.7}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={18} color="#007BFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Proyección de Deuda</Text>
          <Text style={styles.subtitle}>
            {summary.pendingCount} cuotas en {summary.monthsRemaining}{" "}
            {summary.monthsRemaining === 1 ? "período" : "períodos"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ADB5BD" />
      </View>

      {/* ── Month rows ──────────────────────────────────────── */}
      <View style={styles.monthList}>
        {next3.map((m, i) => {
          const barPct = Math.max((m.CLP / maxCLP) * 100, 3);
          const isFirst = i === 0;
          return (
            <View key={m.month} style={styles.monthRow}>
              {/* Left: label + bar */}
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
              {/* Right: amounts */}
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
            + {extraMonths} {extraMonths === 1 ? "período más" : "períodos más"}{" "}
            →
          </Text>
        )}
      </View>

      {/* ── Footer: total ────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Total pendiente</Text>
        <View style={styles.footerAmounts}>
          {summary.totalCLP > 0 && (
            <Text style={styles.footerCLP}>
              ${summary.totalCLP.toLocaleString("es-CL")}
            </Text>
          )}
          {summary.totalUSD > 0 && (
            <Text style={styles.footerUSD}>
              US${summary.totalUSD.toLocaleString("es-CL")}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 3,
    shadowColor: colors.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EBF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: fontSizes.md, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.sm - 1, color: colors.textMuted, marginTop: 1 },
  // ── Month list ──────────────────────────────────────────
  monthList: {
    gap: 12,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthLeft: {
    flex: 1,
    gap: 6,
  },
  monthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nowChip: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nowChipText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.bgWhite,
    letterSpacing: 0.5,
  },
  monthName: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  monthNameCurrent: {
    color: colors.primary,
    fontWeight: "700",
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barCurrent: {
    backgroundColor: colors.primary,
  },
  barFuture: {
    backgroundColor: colors.textMuted,
  },
  // ── Month amounts ───────────────────────────────────────
  monthRight: {
    alignItems: "flex-end",
    minWidth: 110,
  },
  monthCLP: {
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
  monthCLPCurrent: {
    color: colors.primary,
  },
  monthCLPFuture: {
    color: colors.textSecondary,
  },
  monthUSD: {
    fontSize: fontSizes.sm - 2,
    color: colors.primaryDark,
    fontWeight: "600",
    marginTop: 2,
  },
  moreMonths: {
    fontSize: fontSizes.sm - 1,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },
  // ── Footer ──────────────────────────────────────────────
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
    fontSize: fontSizes.sm - 1,
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
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.textMuted,
  },
  footerUSD: {
    fontSize: fontSizes.sm - 2,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
