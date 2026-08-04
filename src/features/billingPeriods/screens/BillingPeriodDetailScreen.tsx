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
import ErrorState from "@/shared/components/ErrorState";
import {
  getTransactionsByCreditCard,
  Transaction,
} from "@/features/transactions/services/transactionsApi";
import { isSessionExpired } from "@/shared/utils/authEvents";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";

interface BillingPeriodDetailScreenProps {
  creditCardId: string;
  periodMonth: string;
  periodStartDate: string;
  periodEndDate: string;
}

const MONTH_NAMES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Converts YYYY-MM (DB format) to human-readable, e.g. "Jul 2026". */
const formatMonthDisplay = (month: string): string => {
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [, m] = month.split("-");
    const idx = parseInt(m, 10);
    return `${MONTH_NAMES[idx]} ${month.slice(0, 4)}`;
  }
  return month;
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
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
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      const allResponse = await getTransactionsByCreditCard(creditCardId);
      const all = allResponse.items;

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
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar las transacciones");
      if (!isSessionExpired())
        console.error("Error loading period transactions:", error);
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

  let totalCLP = 0;
  let totalUSD = 0;
  transactions.forEach((t) => {
    if (t.currency === "USD") totalUSD += t.amount;
    else totalCLP += t.amount;
  });

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
      if (t.currency === "USD") groups[day].totalUSD += t.amount;
      else groups[day].totalCLP += t.amount;
    });
    return Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
  })();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Cargando transacciones...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar las transacciones del período." onRetry={loadTransactions} />;
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
      <View style={styles.periodCard}>
        <View style={styles.periodHeader}>
          <Ionicons name="calendar" size={20} color={colors.secondary} />
          <Text style={styles.periodMonth}>{formatMonthDisplay(periodMonth)}</Text>
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
          <Ionicons name="receipt-outline" size={14} color={colors.textMuted} />
          <Text style={styles.countText}>
            {transactions.length}{" "}
            {transactions.length === 1 ? "transacción" : "transacciones"}
          </Text>
        </View>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={colors.border} />
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
                  {t.currency === "USD" ? "US$" : "$"}
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
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md2,
  },
  loadingText: {
    marginTop: spacing.sm2,
    fontSize: 15,
    color: colors.textMuted,
  },
  periodCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 18,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  periodMonth: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  periodDates: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginLeft: 28,
  },
  totalsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.sm2,
  },
  totalBlock: {},
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  totalCLP: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.destructive,
  },
  totalUSD: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  countText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dayGroup: {
    marginBottom: spacing.sm2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  dayTotals: {
    flexDirection: "row",
    gap: 10,
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.destructive,
  },
  dayTotalUSD: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondary,
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: spacing.sm2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing.sm2,
  },
  merchant: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.destructive,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
