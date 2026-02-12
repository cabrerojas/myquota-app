import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getMonthlyStats } from "../services/statsApi";

interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalDolar: number;
}

interface MonthSummaryCardProps {
  creditCardId: string;
  refreshKey?: number;
}

const MONTH_NAMES: Record<string, string> = {
  Enero: "Enero",
  Febrero: "Febrero",
  Marzo: "Marzo",
  Abril: "Abril",
  Mayo: "Mayo",
  Junio: "Junio",
  Julio: "Julio",
  Agosto: "Agosto",
  Septiembre: "Septiembre",
  Octubre: "Octubre",
  Noviembre: "Noviembre",
  Diciembre: "Diciembre",
};

const getCurrentMonthName = (): string => {
  const date = new Date();
  const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "America/Santiago",
  });
  const yearFormatter = new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    timeZone: "America/Santiago",
  });
  const month = monthFormatter.format(date);
  const year = yearFormatter.format(date);
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};

const getPreviousMonthName = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const monthFormatter = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "America/Santiago",
  });
  const yearFormatter = new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    timeZone: "America/Santiago",
  });
  const month = monthFormatter.format(date);
  const year = yearFormatter.format(date);
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};

export default function MonthSummaryCard({
  creditCardId,
  refreshKey,
}: MonthSummaryCardProps) {
  const [currentMonth, setCurrentMonth] = useState<MonthlyStat | null>(null);
  const [previousMonth, setPreviousMonth] = useState<MonthlyStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthlyStats(creditCardId)
      .then((stats: MonthlyStat[]) => {
        const currentName = getCurrentMonthName();
        const previousName = getPreviousMonthName();

        const current = stats.find((s) => s.month === currentName) || null;
        const previous = stats.find((s) => s.month === previousName) || null;

        setCurrentMonth(current);
        setPreviousMonth(previous);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [creditCardId, refreshKey]);

  if (loading) {
    return null;
  }

  const totalCLP = currentMonth?.totalCLP ?? 0;
  const totalUSD = currentMonth?.totalDolar ?? 0;
  const prevCLP = previousMonth?.totalCLP ?? 0;

  // Calculate variation vs previous month
  let variationPercent = 0;
  let variationDirection: "up" | "down" | "same" = "same";
  if (prevCLP > 0 && totalCLP > 0) {
    variationPercent = Math.round(((totalCLP - prevCLP) / prevCLP) * 100);
    variationDirection =
      variationPercent > 0 ? "up" : variationPercent < 0 ? "down" : "same";
  }

  const monthName = getCurrentMonthName();
  const monthDisplayName = monthName.split(" ")[0]; // Solo el mes sin año

  return (
    <View style={styles.card}>
      {/* Header con gradiente simulado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.9)" />
          <Text style={styles.headerTitle}>Resumen {monthDisplayName}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Total CLP */}
        <View style={styles.amountRow}>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Total Pesos</Text>
            <Text style={styles.amountCLP}>
              ${totalCLP.toLocaleString("es-CL")}
            </Text>
          </View>
          {variationDirection !== "same" && (
            <View
              style={[
                styles.variationBadge,
                variationDirection === "up"
                  ? styles.variationUp
                  : styles.variationDown,
              ]}
            >
              <Ionicons
                name={
                  variationDirection === "up"
                    ? "trending-up"
                    : "trending-down"
                }
                size={14}
                color={variationDirection === "up" ? "#DC3545" : "#28A745"}
              />
              <Text
                style={[
                  styles.variationText,
                  variationDirection === "up"
                    ? styles.variationTextUp
                    : styles.variationTextDown,
                ]}
              >
                {Math.abs(variationPercent)}%
              </Text>
            </View>
          )}
        </View>

        {/* Total USD */}
        {totalUSD > 0 && (
          <View style={styles.usdRow}>
            <Text style={styles.usdLabel}>Total Dólar</Text>
            <Text style={styles.amountUSD}>
              US${totalUSD.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {/* Previous month comparison */}
        {prevCLP > 0 && (
          <View style={styles.comparisonRow}>
            <Ionicons name="time-outline" size={13} color="#ADB5BD" />
            <Text style={styles.comparisonText}>
              {getPreviousMonthName().split(" ")[0]}: ${prevCLP.toLocaleString("es-CL")}
            </Text>
          </View>
        )}

        {totalCLP === 0 && totalUSD === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={32} color="#CED4DA" />
            <Text style={styles.emptyText}>
              Sin gastos registrados este mes
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  header: {
    backgroundColor: "#007BFF",
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  body: {
    padding: 16,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountBlock: {},
  amountLabel: {
    fontSize: 11,
    color: "#868E96",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountCLP: {
    fontSize: 26,
    fontWeight: "800",
    color: "#212529",
  },
  variationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  variationUp: {
    backgroundColor: "rgba(220, 53, 69, 0.08)",
  },
  variationDown: {
    backgroundColor: "rgba(40, 167, 69, 0.08)",
  },
  variationText: {
    fontSize: 13,
    fontWeight: "700",
  },
  variationTextUp: {
    color: "#DC3545",
  },
  variationTextDown: {
    color: "#28A745",
  },
  usdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  usdLabel: {
    fontSize: 11,
    color: "#868E96",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountUSD: {
    fontSize: 19,
    fontWeight: "700",
    color: "#007BFF",
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 5,
  },
  comparisonText: {
    fontSize: 12,
    color: "#ADB5BD",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#868E96",
  },
});
