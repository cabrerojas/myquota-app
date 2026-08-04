import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCreditCards } from "@/features/creditCards/services/creditCardsApi";
import ErrorState from "@/shared/components/ErrorState";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import {
  getQuotasByTransaction,
  Quota,
} from "@/features/quotas/services/quotasApi";
import {
  getBillingPeriodsByCreditCard,
  BillingPeriod,
  payBillingPeriod,
} from "@/features/billingPeriods/services/billingPeriodsApi";
import { formatCurrency } from "@/shared/utils/format";
import { colors } from "@/shared/theme/colors";
import { borderRadius } from "@/shared/theme/tokens";
import { typography } from "@/shared/theme/typography";
import { glassSurface } from "@/shared/theme/effects";

interface MonthBucket {
  key: string;
  label: string;
  totalCLP: number;
  totalUSD: number;
  count: number;
  details: {
    merchant: string;
    amount: number;
    currency: string;
    quotaNumber: number;
    totalQuotas: number;
    transactionId: string;
    creditCardId: string;
  }[];
  periodsByCard: { creditCardId: string; billingPeriodId: string }[];
}

interface QuotaEnriched extends Quota {
  merchant: string;
  creditCardId: string;
  creditCardLabel: string;
  quotaNumber: number;
  totalQuotas: number;
}

const parseCalendarKey = (key: string): number => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).getTime();
};

export default function DebtForecastScreen() {
  const router = useRouter();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const {
    data: cardsData = [],
    isLoading: loadingCards,
    error: cardsError,
  } = useCreditCards();

  const txQueries = useQueries({
    queries: cardsData.map((card) => ({
      queryKey: ["transactions", card.id],
      queryFn: () => getTransactionsByCreditCard(card.id).then((r) => r.items),
      staleTime: 5 * 60 * 1000,
      enabled: cardsData.length > 0,
    })),
  });

  const bpQueries = useQueries({
    queries: cardsData.map((card) => ({
      queryKey: ["billingPeriods", card.id],
      queryFn: () =>
        getBillingPeriodsByCreditCard(card.id).then((r) => r.items),
      staleTime: 5 * 60 * 1000,
      enabled: cardsData.length > 0,
    })),
  });

  const allTransactions = txQueries.flatMap((q) => q.data ?? []);
  const quotaQueries = useQueries({
    queries: allTransactions.map((tx) => ({
      queryKey: ["quotas", tx.creditCardId, tx.id],
      queryFn: () => getQuotasByTransaction(tx.creditCardId, tx.id),
      staleTime: 5 * 60 * 1000,
      enabled: allTransactions.length > 0,
    })),
  });

  const { months, totalDebtCLP, totalDebtUSD } = useMemo(() => {
    const allQuotas: QuotaEnriched[] = [];
    const allBillingPeriods: (BillingPeriod & { creditCardId: string })[] = [];
    let quotaIdx = 0;

    cardsData.forEach((card, i) => {
      const bpData = bpQueries[i]?.data ?? [];
      allBillingPeriods.push(
        ...bpData.map((p) => ({ ...p, creditCardId: card.id })),
      );

      const txs = txQueries[i]?.data ?? [];
      txs.forEach((tx) => {
        const quotas = quotaQueries[quotaIdx]?.data ?? [];
        const sorted = [...quotas].sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );
        sorted.forEach((q, qIdx) => {
          allQuotas.push({
            ...q,
            merchant: tx.merchant,
            creditCardId: card.id,
            creditCardLabel: `${card.cardType} •${card.cardLastDigits}`,
            quotaNumber: qIdx + 1,
            totalQuotas: sorted.length,
          });
        });
        quotaIdx++;
      });
    });

    const pending = allQuotas.filter((q) => q.status === "pending");
    const sortedPeriods = [...allBillingPeriods].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    const findPeriodForQuota = (dueDate: string): BillingPeriod | null => {
      const d = new Date(dueDate).getTime();
      for (const p of sortedPeriods) {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        if (d >= start && d <= end) return p;
      }
      return null;
    };

    const bucketMap = new Map<string, MonthBucket>();
    for (const q of pending) {
      const period = findPeriodForQuota(q.dueDate);
      let key: string;
      let label: string;
      if (period) {
        key = period.month;
        label = period.month;
      } else {
        const date = new Date(q.dueDate);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = date.toLocaleDateString("es-CL", {
          month: "long",
          year: "numeric",
          timeZone: "America/Santiago",
        });
        label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      }

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          key,
          label,
          totalCLP: 0,
          totalUSD: 0,
          count: 0,
          details: [],
          periodsByCard: [],
        });
      }
      const bucket = bucketMap.get(key)!;
      if (q.currency === "USD") {
        bucket.totalUSD += q.amount;
      } else {
        bucket.totalCLP += q.amount;
      }
      bucket.count += 1;
      bucket.details.push({
        merchant: q.merchant,
        amount: q.amount,
        currency: q.currency,
        quotaNumber: q.quotaNumber,
        totalQuotas: q.totalQuotas,
        transactionId: q.transactionId,
        creditCardId: q.creditCardId,
      });
    }

    for (const p of allBillingPeriods) {
      const bucket = bucketMap.get(p.month);
      if (bucket) {
        const existing = bucket.periodsByCard.find(
          (pb) =>
            pb.creditCardId === p.creditCardId && pb.billingPeriodId === p.id,
        );
        if (!existing) {
          bucket.periodsByCard.push({
            creditCardId: p.creditCardId,
            billingPeriodId: p.id,
          });
        }
      }
    }

    const periodStartMap = new Map<string, number>();
    for (const p of sortedPeriods) {
      if (!periodStartMap.has(p.month)) {
        periodStartMap.set(p.month, new Date(p.startDate).getTime());
      }
    }

    const sorted = Array.from(bucketMap.values()).sort((a, b) => {
      const aTime = periodStartMap.get(a.key) ?? parseCalendarKey(a.key);
      const bTime = periodStartMap.get(b.key) ?? parseCalendarKey(b.key);
      return aTime - bTime;
    });

    return {
      months: sorted,
      totalDebtCLP: pending
        .filter((q) => q.currency !== "USD")
        .reduce((s, q) => s + q.amount, 0),
      totalDebtUSD: pending
        .filter((q) => q.currency === "USD")
        .reduce((s, q) => s + q.amount, 0),
    };
  }, [cardsData, txQueries, bpQueries, quotaQueries]);

  const isLoading =
    loadingCards ||
    txQueries.some((q) => q.isLoading) ||
    bpQueries.some((q) => q.isLoading);

  const isRefreshing =
    txQueries.some((q) => q.isRefetching) ||
    bpQueries.some((q) => q.isRefetching) ||
    quotaQueries.some((q) => q.isRefetching);

  const error =
    cardsError ||
    txQueries.find((q) => q.error)?.error ||
    bpQueries.find((q) => q.error)?.error;

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["billingPeriods"] }),
      queryClient.invalidateQueries({ queryKey: ["quotas"] }),
    ]);
  }, [queryClient]);

  const handlePayPeriod = (month: MonthBucket) => {
    if (month.periodsByCard.length === 0) {
      Alert.alert("Sin período", "No hay período de facturación asociado.");
      return;
    }
    const amountText = [
      month.totalCLP > 0 ? `$${month.totalCLP.toLocaleString("es-CL")}` : "",
      month.totalUSD > 0 ? `US$${month.totalUSD.toLocaleString("es-CL")}` : "",
    ]
      .filter(Boolean)
      .join(" + ");

    Alert.alert(
      "Confirmar Pago",
      `¿Marcar las ${month.count} cuotas de ${month.label}?\n\nTotal: ${amountText}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Pagar",
          onPress: async () => {
            setPaying(month.key);
            try {
              let totalPaid = 0;
              for (const pb of month.periodsByCard) {
                const result = await payBillingPeriod(
                  pb.creditCardId,
                  pb.billingPeriodId,
                );
                totalPaid += result.paidCount;
              }
              Alert.alert("Éxito", `${totalPaid} cuotas pagadas`);
              await queryClient.invalidateQueries({ queryKey: ["quotas"] });
              await queryClient.invalidateQueries({
                queryKey: ["transactions"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["billingPeriods"],
              });
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "No se pudo procesar el pago",
              );
            } finally {
              setPaying(null);
            }
          },
        },
      ],
    );
  };

  const getCurrentPeriodLabel = () => {
    const now = new Date();
    const label = now.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const currentPeriodLabel = getCurrentPeriodLabel();

  const maxMonthTotal = Math.max(
    ...months.map((m) => m.totalCLP + m.totalUSD * 900),
    1,
  );

  const totalCount = months.reduce((s, m) => s + m.count, 0);

  if (isLoading && months.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Calculando proyección...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="No se pudo calcular la proyección de deuda."
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["creditCards"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["billingPeriods"] });
        }}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* ── Total Debt Hero ───────────────────────────────── */}
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <View style={styles.totalIconBox}>
              <Ionicons
                name={
                  totalDebtCLP + totalDebtUSD > 0
                    ? "trending-down"
                    : "checkmark-circle"
                }
                size={20}
                color={
                  totalDebtCLP + totalDebtUSD > 0
                    ? colors.accent
                    : colors.success
                }
              />
            </View>
            <View>
              <Text style={styles.totalLabel}>PROYECCIÓN DE DEUDA</Text>
              <Text style={styles.totalMeta}>
                {months.length} {months.length === 1 ? "mes" : "meses"} •{" "}
                {totalCount} {totalCount === 1 ? "cuota" : "cuotas"}
              </Text>
            </View>
          </View>

          <View style={styles.totalAmounts}>
            {totalDebtCLP + totalDebtUSD === 0 ? (
              <Text style={styles.totalZero}>Sin deuda pendiente</Text>
            ) : (
              <>
                {totalDebtCLP > 0 && (
                  <Text style={styles.totalCLP}>
                    ${totalDebtCLP.toLocaleString("es-CL")}
                  </Text>
                )}
                {totalDebtUSD > 0 && (
                  <Text style={styles.totalUSD}>
                    US${totalDebtUSD.toLocaleString("es-CL")}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Mini progress bar */}
          {totalDebtCLP + totalDebtUSD > 0 && months.length > 0 && (
            <View style={styles.totalProgress}>
              <View style={styles.totalProgressBg}>
                {months.map((m, i) => (
                  <View
                    key={m.key}
                    style={[
                      styles.totalProgressSeg,
                      {
                        flex: m.count || 1,
                        backgroundColor:
                          i === 0
                            ? colors.accent
                            : i < 3
                              ? `${colors.accent}80`
                              : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.totalProgressLabel}>
                {months.length > 3
                  ? `Próximos ${months.length} meses`
                  : "Próximos meses"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Monthly Breakdown ──────────────────────────────── */}
        {months.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="happy-outline" size={36} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>¡Sin deudas pendientes!</Text>
            <Text style={styles.emptySubtitle}>
              No tenés cuotas pendientes de pago.{"\n"}¡Buen trabajo manteniendo
              tus finanzas al día!
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Proyección mensual</Text>

            {months.map((month, idx) => {
              const barPct =
                ((month.totalCLP + month.totalUSD * 900) / maxMonthTotal) * 100;
              const isExpanded = expandedMonth === month.key;
              const isCurrent =
                month.label.toLowerCase() === currentPeriodLabel.toLowerCase();
              const isFirst = idx === 0;

              return (
                <Pressable
                  key={month.key}
                  onPress={() =>
                    setExpandedMonth(isExpanded ? null : month.key)
                  }
                  style={[
                    styles.monthCard,
                    isCurrent && styles.monthCardCurrent,
                    isFirst && styles.monthCardFirst,
                  ]}
                  accessibilityLabel={month.label}
                  accessibilityRole="button"
                >
                  {/* Header */}
                  <View style={styles.monthHeader}>
                    <View style={styles.monthHeaderLeft}>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Ionicons
                            name="time-outline"
                            size={10}
                            color={colors.accent}
                          />
                          <Text style={styles.currentBadgeText}>ESTE MES</Text>
                        </View>
                      )}
                      <Text style={styles.monthLabel}>{month.label}</Text>
                      <Text style={styles.monthCount}>
                        {month.count} {month.count === 1 ? "cuota" : "cuotas"}
                      </Text>
                    </View>
                    <View style={styles.monthHeaderRight}>
                      {month.totalCLP > 0 && (
                        <Text style={styles.monthAmount}>
                          ${month.totalCLP.toLocaleString("es-CL")}
                        </Text>
                      )}
                      {month.totalUSD > 0 && (
                        <Text style={styles.monthAmountUSD}>
                          US${month.totalUSD.toLocaleString("es-CL")}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Bar */}
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(barPct, 3)}%` },
                        isCurrent && styles.barFillFirst,
                        isFirst && !isCurrent && styles.barFillFirst,
                        !isFirst && !isCurrent && styles.barFillLater,
                      ]}
                    />
                  </View>

                  {/* Actions */}
                  <View style={styles.monthActions}>
                    {/* Pay button — first (current) month gets emphasis */}
                    {month.periodsByCard.length > 0 && (
                      <Pressable
                        style={[
                          styles.payButton,
                          isCurrent && styles.payButtonPrimary,
                          paying === month.key && styles.payButtonLoading,
                        ]}
                        onPress={() => handlePayPeriod(month)}
                        disabled={paying === month.key}
                        accessibilityLabel="Pagar período"
                        accessibilityRole="button"
                      >
                        {paying === month.key ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              isCurrent ? colors.textPrimary : colors.accent
                            }
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-done"
                              size={14}
                              color={
                                isCurrent ? colors.textPrimary : colors.accent
                              }
                            />
                            <Text
                              style={[
                                styles.payButtonText,
                                !isCurrent && styles.payButtonTextOutline,
                              ]}
                            >
                              Pagar período
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    <View style={styles.expandIndicator}>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.expandText}>
                        {isExpanded ? "Ocultar" : "Detalle"}
                      </Text>
                    </View>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {month.details
                        .sort((a, b) => b.amount - a.amount)
                        .map((d, i) => (
                          <Pressable
                            key={i}
                            onPress={() =>
                              router.push({
                                pathname: "/(screens)/transactionDetail",
                                params: {
                                  creditCardId: d.creditCardId,
                                  transactionId: d.transactionId,
                                },
                              })
                            }
                            style={({ pressed }) => [
                              styles.detailRow,
                              pressed && { opacity: 0.7 },
                            ]}
                            accessibilityLabel={`${d.merchant}, cuota ${d.quotaNumber}`}
                            accessibilityRole="button"
                          >
                            <View style={styles.detailLeft}>
                              <Text
                                style={styles.detailMerchant}
                                numberOfLines={1}
                              >
                                {d.merchant}
                              </Text>
                              <Text style={styles.detailQuota}>
                                Cuota {d.quotaNumber}/{d.totalQuotas}
                              </Text>
                            </View>
                            <View style={styles.detailRight}>
                              <Text style={styles.detailAmount}>
                                {formatCurrency(d.amount, d.currency)}
                              </Text>
                              <Ionicons
                                name="chevron-forward"
                                size={14}
                                color={colors.textSubtle}
                              />
                            </View>
                          </Pressable>
                        ))}
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* ── Cumulative ───────────────────────────────── */}
            {months.length > 1 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  Proyección acumulada
                </Text>
                <View style={styles.cumulativeCard}>
                  {(() => {
                    let runningCLP = 0;
                    let runningUSD = 0;
                    return months.map((m, idx) => {
                      runningCLP += m.totalCLP;
                      runningUSD += m.totalUSD;
                      const isLast = idx === months.length - 1;
                      return (
                        <View key={m.key} style={styles.cumRow}>
                          <View style={styles.cumLeft}>
                            {!isLast && <View style={styles.cumLineInactive} />}
                            <View
                              style={[
                                styles.cumDot,
                                isLast && styles.cumDotLast,
                                idx === 0 && styles.cumDotFirst,
                              ]}
                            />
                            {!isLast && <View style={styles.cumLine} />}
                          </View>
                          <View style={styles.cumContent}>
                            <View style={styles.cumContentRow}>
                              <Text
                                style={[
                                  styles.cumMonth,
                                  isLast && styles.cumMonthLast,
                                ]}
                              >
                                {m.label}
                              </Text>
                              <Text
                                style={[
                                  styles.cumAmount,
                                  isLast && styles.cumAmountLast,
                                ]}
                              >
                                {runningCLP > 0
                                  ? `$${runningCLP.toLocaleString("es-CL")}`
                                  : ""}
                                {runningCLP > 0 && runningUSD > 0 ? " + " : ""}
                                {runningUSD > 0
                                  ? `US$${runningUSD.toLocaleString("es-CL")}`
                                  : ""}
                              </Text>
                            </View>
                            <Text style={styles.cumCount}>
                              {m.count} {m.count === 1 ? "cuota" : "cuotas"}
                            </Text>
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(screens)/addDebt")}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityLabel="Agregar deuda"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={26} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  contentContainer: { padding: 24, paddingBottom: 80 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    gap: 12,
  },
  loadingText: { fontSize: 15, color: colors.textMuted },

  // ── Total debt hero ─────────────────────────────────────
  totalCard: {
    ...glassSurface(true),
    padding: 22,
    marginBottom: 24,
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  totalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  totalMeta: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 1,
  },
  totalAmounts: {
    gap: 2,
    marginBottom: 12,
  },
  totalCLP: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -0.5,
  },
  totalUSD: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  totalZero: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.success,
  },
  totalProgress: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalProgressBg: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    gap: 2,
  },
  totalProgressSeg: {
    height: "100%",
    borderRadius: 2,
  },
  totalProgressLabel: {
    fontSize: 10,
    color: colors.textSubtle,
  },

  // ── Section title ───────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // ── Month card ──────────────────────────────────────────
  monthCard: {
    ...glassSurface(false),
    padding: 16,
    marginBottom: 10,
  },
  monthCardCurrent: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  monthCardFirst: {},
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  monthHeaderLeft: { flex: 1 },
  monthHeaderRight: { alignItems: "flex-end" },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.5,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  monthCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  monthAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
  },
  monthAmountUSD: {
    ...typography.presets.label,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ── Bar ─────────────────────────────────────────────────
  barContainer: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  barFillFirst: {
    backgroundColor: colors.accent,
  },
  barFillLater: {
    backgroundColor: colors.textSubtle,
  },

  // ── Actions ─────────────────────────────────────────────
  monthActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.input,
    backgroundColor: "rgba(5,150,105,0.12)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.2)",
  },
  payButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  payButtonLoading: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  payButtonTextOutline: {
    color: colors.success,
  },
  expandIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },

  // ── Details ─────────────────────────────────────────────
  detailsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  detailLeft: { flex: 1, marginRight: 10 },
  detailMerchant: {
    ...typography.presets.label,
    color: colors.textPrimary,
  },
  detailQuota: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  detailAmount: { ...typography.presets.cardTitle, color: colors.accent },
  detailRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // ── Empty ───────────────────────────────────────────────
  emptyCard: {
    ...glassSurface(false),
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(5,150,105,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 2,
  },

  // ── Cumulative ──────────────────────────────────────────
  cumulativeCard: {
    ...glassSurface(false),
    padding: 16,
  },
  cumRow: {
    flexDirection: "row",
    minHeight: 44,
  },
  cumLeft: {
    width: 24,
    alignItems: "center",
    marginRight: 10,
  },
  cumLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.accent,
  },
  cumLineInactive: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 11,
    backgroundColor: colors.border,
  },
  cumDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginVertical: 4,
  },
  cumDotFirst: {
    backgroundColor: colors.accent,
  },
  cumDotLast: {
    backgroundColor: colors.success,
  },
  cumContent: {
    flex: 1,
    paddingBottom: 12,
  },
  cumContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cumMonth: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cumMonthLast: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cumAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  cumAmountLast: {
    color: colors.accent,
    fontWeight: "700",
  },
  cumCount: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 1,
  },

  // ── FAB ─────────────────────────────────────────────────
  fab: {
    position: "absolute",
    right: 24,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
