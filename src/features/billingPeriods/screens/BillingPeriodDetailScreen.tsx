import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  getTransactionsByCreditCard,
  Transaction,
} from "@/features/transactions/services/transactionsApi";
import { isSessionExpired } from "@/shared/utils/authEvents";

interface BillingPeriodDetailScreenProps {
  creditCardId: string;
  periodMonth: string;
  periodStartDate: string;
  periodEndDate: string;
}

const formatDisplayDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const getDayKey = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", {
      timeZone: "America/Santiago",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
};

interface GroupedTransactions {
  day: string;
  sortKey: number;
  transactions: Transaction[];
  totalCLP: number;
  totalUSD: number;
}

export default function BillingPeriodDetailScreen({
  creditCardId,
  periodMonth,
  periodStartDate,
  periodEndDate,
}: BillingPeriodDetailScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const all = await getTransactionsByCreditCard(creditCardId);

      const startDate = new Date(periodStartDate);
      const endDate = new Date(periodEndDate);

      const filtered = all.filter((t) => {
        const tDate = new Date(t.transactionDate);
        return tDate >= startDate && tDate <= endDate;
      });

      filtered.sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );

      setTransactions(filtered);
    } catch (error) {
      if (!isSessionExpired()) console.error("Error loading period transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [creditCardId, periodStartDate, periodEndDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  // Totals
  let totalCLP = 0;
  let totalUSD = 0;
  transactions.forEach((t) => {
    if (t.currency === "Dolar") totalUSD += t.amount;
    else totalCLP += t.amount;
  });

  // Group by day
  const grouped: GroupedTransactions[] = (() => {
    const groups: Record<string, GroupedTransactions> = {};
    transactions.forEach((t) => {
      const day = getDayKey(t.transactionDate);
      if (!groups[day]) {
        groups[day] = {
          day,
          sortKey: new Date(t.transactionDate).getTime(),
          transactions: [],
          totalCLP: 0,
          totalUSD: 0,
        };
      }
      groups[day].transactions.push(t);
      if (t.currency === "Dolar") groups[day].totalUSD += t.amount;
      else groups[day].totalCLP += t.amount;
    });
    return Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
  })();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Cargando transacciones...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Period info card */}
      <View style={styles.periodCard}>
        <View style={styles.periodHeader}>
          <Ionicons name="calendar" size={20} color="#007BFF" />
          <Text style={styles.periodMonth}>{periodMonth}</Text>
        </View>
        <Text style={styles.periodDates}>
          {formatDisplayDate(periodStartDate)} —{" "}
          {formatDisplayDate(periodEndDate)}
        </Text>

        <View style={styles.totalsRow}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total CLP</Text>
            <Text style={styles.totalCLP}>
              ${totalCLP.toLocaleString("es-CL")}
            </Text>
          </View>
          {totalUSD > 0 && (
            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>Total USD</Text>
              <Text style={styles.totalUSD}>
                US$
                {totalUSD.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.countRow}>
          <Ionicons name="receipt-outline" size={14} color="#868E96" />
          <Text style={styles.countText}>
            {transactions.length}{" "}
            {transactions.length === 1 ? "transacción" : "transacciones"}
          </Text>
        </View>
      </View>

      {/* Transactions grouped by day */}
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#CED4DA" />
          <Text style={styles.emptyText}>
            Sin transacciones en este período
          </Text>
        </View>
      ) : (
        grouped.map((group) => (
          <View key={group.day} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{group.day}</Text>
              <View style={styles.dayTotals}>
                {group.totalCLP > 0 && (
                  <Text style={styles.dayTotal}>
                    ${group.totalCLP.toLocaleString("es-CL")}
                  </Text>
                )}
                {group.totalUSD > 0 && (
                  <Text style={styles.dayTotalUSD}>
                    US$
                    {group.totalUSD.toLocaleString("es-CL", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                )}
              </View>
            </View>
            {group.transactions.map((t) => (
              <View key={t.id} style={styles.transaction}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.merchant} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDisplayDate(t.transactionDate)}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {t.currency === "Dolar" ? "US$" : "$"}
                  {t.amount.toLocaleString("es-CL")}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#868E96",
  },
  // Period card
  periodCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  periodMonth: {
    fontSize: 20,
    fontWeight: "800",
    color: "#212529",
  },
  periodDates: {
    fontSize: 13,
    color: "#868E96",
    marginBottom: 16,
    marginLeft: 28,
  },
  totalsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 12,
  },
  totalBlock: {},
  totalLabel: {
    fontSize: 11,
    color: "#868E96",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalCLP: {
    fontSize: 22,
    fontWeight: "800",
    color: "#DC3545",
  },
  totalUSD: {
    fontSize: 22,
    fontWeight: "800",
    color: "#007BFF",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  countText: {
    fontSize: 13,
    color: "#868E96",
  },
  // Day groups
  dayGroup: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#495057",
    textTransform: "capitalize",
  },
  dayTotals: {
    flexDirection: "row",
    gap: 10,
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC3545",
  },
  dayTotalUSD: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  merchant: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212529",
  },
  transactionDate: {
    fontSize: 12,
    color: "#ADB5BD",
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC3545",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#868E96",
  },
});
