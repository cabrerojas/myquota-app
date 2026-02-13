import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import { getQuotasByTransaction } from "@/features/quotas/services/quotasApi";

interface DebtSummary {
  totalCLP: number;
  totalUSD: number;
  pendingCount: number;
  monthsRemaining: number;
  nextMonthCLP: number;
  nextMonthUSD: number;
}

interface DebtIndicatorCardProps {
  refreshKey?: number;
}

export default function DebtIndicatorCard({ refreshKey }: DebtIndicatorCardProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebtSummary();
  }, [refreshKey]);

  const fetchDebtSummary = async () => {
    try {
      const cards = await getCreditCards();
      let totalCLP = 0;
      let totalUSD = 0;
      let pendingCount = 0;
      let nextMonthCLP = 0;
      let nextMonthUSD = 0;
      const monthKeys = new Set<string>();

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

      for (const card of cards) {
        const txs = await getTransactionsByCreditCard(card.id);
        for (const tx of txs) {
          const quotas = await getQuotasByTransaction(card.id, tx.id);
          const pending = quotas.filter((q) => q.status === "pending");

          for (const q of pending) {
            pendingCount++;
            const date = new Date(q.due_date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            monthKeys.add(key);

            if (q.currency === "Dolar") {
              totalUSD += q.amount;
            } else {
              totalCLP += q.amount;
            }

            // Current or next month
            if (key === currentMonthKey || key === nextMonthKey) {
              if (q.currency === "Dolar") {
                nextMonthUSD += q.amount;
              } else {
                nextMonthCLP += q.amount;
              }
            }
          }
        }
      }

      setSummary({
        totalCLP,
        totalUSD,
        pendingCount,
        monthsRemaining: monthKeys.size,
        nextMonthCLP,
        nextMonthUSD,
      });
    } catch (error) {
      console.error("Error fetching debt summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary || (summary.totalCLP === 0 && summary.totalUSD === 0)) {
    return null;
  }

  const severityColor = summary.pendingCount > 20 ? "#DC3545" : summary.pendingCount > 10 ? "#F57C00" : "#007BFF";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push("/(drawer)/debtForecast")}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: severityColor + "15" }]}>
          <Ionicons name="trending-up" size={20} color={severityColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Deuda en Cuotas</Text>
          <Text style={styles.subtitle}>
            {summary.pendingCount} cuotas en {summary.monthsRemaining}{" "}
            {summary.monthsRemaining === 1 ? "mes" : "meses"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#868E96" />
      </View>

      <View style={styles.amounts}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Total pendiente</Text>
          <View style={styles.amountValues}>
            {summary.totalCLP > 0 && (
              <Text style={[styles.amountValue, { color: severityColor }]}>
                ${summary.totalCLP.toLocaleString("es-CL")}
              </Text>
            )}
            {summary.totalUSD > 0 && (
              <Text style={[styles.amountValue, { color: "#0056B3", fontSize: 14 }]}>
                US${summary.totalUSD.toLocaleString("es-CL")}
              </Text>
            )}
          </View>
        </View>
        {(summary.nextMonthCLP > 0 || summary.nextMonthUSD > 0) && (
          <View style={[styles.amountBlock, styles.amountBlockRight]}>
            <Text style={styles.amountLabel}>Próximo pago</Text>
            <View style={styles.amountValues}>
              {summary.nextMonthCLP > 0 && (
                <Text style={styles.nextPayValue}>
                  ${summary.nextMonthCLP.toLocaleString("es-CL")}
                </Text>
              )}
              {summary.nextMonthUSD > 0 && (
                <Text style={[styles.nextPayValue, { color: "#0056B3", fontSize: 13 }]}>
                  US${summary.nextMonthUSD.toLocaleString("es-CL")}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#212529",
  },
  subtitle: {
    fontSize: 12,
    color: "#868E96",
    marginTop: 1,
  },
  amounts: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  amountBlock: { flex: 1 },
  amountBlockRight: {
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: "#F1F3F5",
    paddingLeft: 12,
  },
  amountLabel: {
    fontSize: 11,
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  amountValues: { gap: 2 },
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC3545",
  },
  nextPayValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F57C00",
  },
});
