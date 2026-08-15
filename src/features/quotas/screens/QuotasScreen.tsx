import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import {
  getQuotasByTransaction,
  splitQuotas,
  updateQuota,
  QuotaWithTransaction,
} from "@/features/quotas/services/quotasApi";
import { CreditCardBasic } from "@/shared/types/creditCard";
import type { Transaction } from "@/shared/types/transaction";
import QuotasSkeleton from "../components/QuotasSkeleton";
import { isSessionExpired } from "@/shared/utils/authEvents";
import ErrorState from "@/shared/components/ErrorState";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
} from "@/shared/utils/format";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";

type FilterMode = "pending" | "paid" | "all";

export default function QuotasScreen() {
  const [creditCards, setCreditCards] = useState<CreditCardBasic[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<QuotaWithTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("pending");

  // Pagination state for transactions
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal para crear cuotas
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [numQuotas, setNumQuotas] = useState("3");
  const [creating, setCreating] = useState(false);

  // Load credit cards
  useEffect(() => {
    getCreditCards().then((cardsResponse) => {
      const cards = cardsResponse.items;
      setCreditCards(cards);
      if (cards.length > 0) {
        setSelectedCardId(cards[0].id);
      }
      setLoading(false);
    });
  }, []);

  const fetchQuotas = useCallback(async (cursor?: string, isRefresh = false) => {
    if (!selectedCardId) return;
    try {
      setError(null);
      const txsResponse = await getTransactionsByCreditCard(
        selectedCardId,
        50,
        cursor,
      );
      const txs = txsResponse.items;

      if (isRefresh || !cursor) {
        setTransactions(txs);
      } else {
        setTransactions((prev) => [...prev, ...txs]);
      }

      setHasMore(txsResponse.metadata.hasMore);
      setNextCursor(txsResponse.metadata.nextCursor);

      // Fetch quotas for all transactions in parallel
      const results = await Promise.all(
        txs.map(async (tx) => {
          const txQuotas = await getQuotasByTransaction(selectedCardId, tx.id);
          if (txQuotas.length === 0) return [];

          const sorted = [...txQuotas].sort(
            (a, b) =>
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          );
          const paidCount = sorted.filter((q) => q.status === "paid").length;

          return sorted.map(
            (q, idx): QuotaWithTransaction => ({
              ...q,
              merchant: tx.merchant,
              transactionDate: tx.transactionDate,
              transactionAmount: tx.amount,
              totalQuotas: sorted.length,
              paidQuotas: paidCount,
              pendingQuotas: sorted.length - paidCount,
              quotaNumber: idx + 1,
            }),
          );
        }),
      );

      setQuotas((prevQuotas: QuotaWithTransaction[]) => {
        const newQuotas = results.flat();

        if (isRefresh || !cursor) {
          // Sort by due date
          newQuotas.sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          );
          return newQuotas;
        } else {
          // Append to existing quotas
          const existingIds = new Set(prevQuotas.map(q => `${q.transactionId}-${q.id}`));
          const filteredNew = newQuotas.filter(q => !existingIds.has(`${q.transactionId}-${q.id}`));
          const allQuotas = [...prevQuotas, ...filteredNew];
          // Sort by due date
          allQuotas.sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          );
          return allQuotas;
        }
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar las cuotas");
      if (!isSessionExpired()) console.error("Error fetching quotas:", error);
    }
  }, [selectedCardId]);

  useEffect(() => {
    if (selectedCardId) {
      setLoading(true);
      fetchQuotas().finally(() => setLoading(false));
    }
  }, [selectedCardId, fetchQuotas]);

  const onRefresh = async () => {
    setRefreshing(true);
    setNextCursor(null);
    await fetchQuotas(undefined, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    fetchQuotas(nextCursor);
  };

  const filteredQuotas = quotas.filter((q) => {
    if (filter === "pending") return q.status === "pending";
    if (filter === "paid") return q.status === "paid";
    return true;
  });

  const handleMarkAsPaid = async (quota: QuotaWithTransaction) => {
    if (!selectedCardId) return;
    try {
      await updateQuota(selectedCardId, quota.transactionId, quota.id, {
        status: "paid",
        paymentDate: new Date().toISOString(),
      });
      await fetchQuotas();
    } catch {
      Alert.alert("Error", "No se pudo marcar la cuota como pagada");
    }
  };

  const handleCreateQuotas = async () => {
    if (!selectedCardId || !selectedTransaction) return;
    const n = parseInt(numQuotas, 10);
    if (isNaN(n) || n < 2 || n > 48) {
      Alert.alert("Error", "Ingresa un número de cuotas entre 2 y 48");
      return;
    }
    setCreating(true);
    try {
      await splitQuotas(selectedCardId, selectedTransaction.id, n);
      Alert.alert(
        "Éxito",
        `${n} cuotas creadas para ${selectedTransaction.merchant}`,
      );
      setShowCreateModal(false);
      setSelectedTransaction(null);
      setNumQuotas("3");
      await fetchQuotas();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudieron crear las cuotas",
      );
    } finally {
      setCreating(false);
    }
  };

  // Group pending quotas by month for summary
  const getSummary = () => {
    const pending = quotas.filter((q) => q.status === "pending");
    const totalPending = pending.reduce((sum, q) => sum + q.amount, 0);
    const nextDue = pending.length > 0 ? pending[0] : null;
    const uniqueTransactions = new Set(pending.map((q) => q.transactionId))
      .size;
    return {
      totalPending,
      nextDue,
      uniqueTransactions,
      pendingCount: pending.length,
    };
  };

  const isDueSoon = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && diffDays >= 0;
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const summary = getSummary();

  if (loading && creditCards.length === 0) {
    return <QuotasSkeleton />;
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar las cuotas." onRetry={fetchQuotas} />;
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
      {/* Card Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.md }}
      >
        {creditCards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.cardChip,
              selectedCardId === card.id && styles.cardChipActive,
            ]}
            onPress={() => setSelectedCardId(card.id)}
          >
            <Ionicons
              name="card-outline"
              size={16}
              color={selectedCardId === card.id ? colors.textPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.cardChipText,
                selectedCardId === card.id && styles.cardChipTextActive,
              ]}
            >
              {card.cardType} •{card.cardLastDigits}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary Card */}
      {!loading && quotas.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={styles.summaryValue}>{summary.pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pendientes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cart-outline" size={20} color={colors.secondary} />
              <Text style={styles.summaryValue}>
                {summary.uniqueTransactions}
              </Text>
              <Text style={styles.summaryLabel}>Compras</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cash-outline" size={20} color={colors.destructive} />
              <Text style={styles.summaryValue}>
                ${summary.totalPending.toLocaleString("es-CL")}
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
          {summary.nextDue && (
            <View style={styles.nextDueRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.nextDueText}>
                Próximo vencimiento: {formatDate(summary.nextDue.dueDate)}
                {" — "}
                <Text style={{ fontWeight: "600" }}>
                  {formatCurrency(
                    summary.nextDue.amount,
                    summary.nextDue.currency,
                  )}
                </Text>
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          {
            key: "pending" as FilterMode,
            label: "Pendientes",
            icon: "time-outline" as const,
          },
          {
            key: "paid" as FilterMode,
            label: "Pagadas",
            icon: "checkmark-circle-outline" as const,
          },
          {
            key: "all" as FilterMode,
            label: "Todas",
            icon: "list-outline" as const,
          },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons
              name={f.icon}
              size={16}
              color={filter === f.key ? colors.textPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterTabText,
                filter === f.key && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Quotas Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.textPrimary} />
        <Text style={styles.createButtonText}>Crear Cuotas</Text>
      </TouchableOpacity>

      {/* Quotas List */}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.secondary}
          style={{ marginTop: spacing.md2 }}
        />
      ) : filteredQuotas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="layers-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>
            {filter === "pending"
              ? "Sin cuotas pendientes"
              : filter === "paid"
                ? "Sin cuotas pagadas"
                : "No hay cuotas"}
          </Text>
          <Text style={styles.emptySubtitle}>
            Usa {'"'}Crear Cuotas{'"'} para dividir una compra en cuotas
          </Text>
        </View>
      ) : (
        filteredQuotas.map((quota) => {
          const overdue =
            quota.status === "pending" && isOverdue(quota.dueDate);
          const dueSoon =
            quota.status === "pending" && !overdue && isDueSoon(quota.dueDate);

          return (
            <View
              key={`${quota.id}-${quota.transactionId}`}
              style={[
                styles.quotaCard,
                overdue && styles.quotaCardOverdue,
                dueSoon && styles.quotaCardDueSoon,
              ]}
            >
              <View style={styles.quotaHeader}>
                <View style={styles.quotaHeaderLeft}>
                  <Text style={styles.quotaMerchant} numberOfLines={1}>
                    {quota.merchant}
                  </Text>
                  <Text style={styles.quotaProgress}>
                    Cuota {quota.quotaNumber} de {quota.totalQuotas}
                  </Text>
                </View>
                <View style={styles.quotaHeaderRight}>
                  <Text
                    style={[
                      styles.quotaAmount,
                      overdue && { color: colors.destructive },
                    ]}
                  >
                    {formatCurrency(quota.amount, quota.currency)}
                  </Text>
                  {quota.status === "paid" ? (
                    <View style={styles.paidBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.success}
                      />
                      <Text style={styles.paidBadgeText}>Pagada</Text>
                    </View>
                  ) : overdue ? (
                    <View
                      style={[styles.paidBadge, { backgroundColor: colors.destructiveBg }]}
                    >
                      <Ionicons name="alert-circle" size={12} color={colors.destructive} />
                      <Text
                        style={[styles.paidBadgeText, { color: colors.destructive }]}
                      >
                        Vencida
                      </Text>
                    </View>
                  ) : dueSoon ? (
                    <View
                      style={[styles.paidBadge, { backgroundColor: colors.warningBg }]}
                    >
                      <Ionicons name="time" size={12} color={colors.warning} />
                      <Text
                        style={[styles.paidBadgeText, { color: colors.warning }]}
                      >
                        Pronto
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.quotaDetails}>
                <View style={styles.quotaDetailItem}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.quotaDetailText}>
                    Vence: {formatShortDate(quota.dueDate)}
                  </Text>
                </View>
                <View style={styles.quotaDetailItem}>
                  <Ionicons name="receipt-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.quotaDetailText}>
                    Compra:{" "}
                    {formatCurrency(quota.transactionAmount, quota.currency)}
                  </Text>
                </View>
              </View>

              {/* Progress mini bar */}
              <View style={styles.miniProgressContainer}>
                <View style={styles.miniProgressBar}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${(quota.paidQuotas / quota.totalQuotas) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.miniProgressText}>
                  {quota.paidQuotas}/{quota.totalQuotas} pagadas
                </Text>
              </View>

              {/* Mark as paid action */}
              {quota.status === "pending" && (
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleMarkAsPaid(quota)}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.markPaidText}>Marcar como pagada</Text>
                </TouchableOpacity>
              )}
              </View>
            );
          })
        )}

        {/* Load More Button */}
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : (
              <View style={styles.loadMoreContent}>
                <Ionicons name="download-outline" size={18} color={colors.secondary} />
                <Text style={styles.loadMoreText}>Cargar más</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

      {/* Create Quotas Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Cuotas</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setSelectedTransaction(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!selectedTransaction ? (
              <>
                <Text style={styles.modalSubtitle}>
                  Selecciona la compra a dividir en cuotas:
                </Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {transactions
                    .filter(
                      (tx) => !quotas.some((q) => q.transactionId === tx.id),
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.transactionDate).getTime() -
                        new Date(a.transactionDate).getTime(),
                    )
                    .map((tx) => (
                      <TouchableOpacity
                        key={tx.id}
                        style={styles.txOption}
                        onPress={() => setSelectedTransaction(tx)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={styles.txOptionMerchant}
                            numberOfLines={1}
                          >
                            {tx.merchant}
                          </Text>
                          <Text style={styles.txOptionDate}>
                            {formatDate(tx.transactionDate)}
                          </Text>
                        </View>
                        <Text style={styles.txOptionAmount}>
                          {formatCurrency(tx.amount, tx.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  {transactions.filter(
                    (tx) => !quotas.some((q) => q.transactionId === tx.id),
                  ).length === 0 && (
                    <Text style={styles.noTxText}>
                      Todas las transacciones ya tienen cuotas asignadas
                    </Text>
                  )}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.selectedTxCard}>
                  <Text style={styles.selectedTxMerchant}>
                    {selectedTransaction.merchant}
                  </Text>
                  <Text style={styles.selectedTxAmount}>
                    {formatCurrency(
                      selectedTransaction.amount,
                      selectedTransaction.currency,
                    )}
                  </Text>
                  <Text style={styles.selectedTxDate}>
                    {formatDate(selectedTransaction.transactionDate)}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Número de cuotas</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={numQuotas}
                  onChangeText={setNumQuotas}
                  placeholder="Ej: 3, 6, 12..."
                />

                {numQuotas &&
                  !isNaN(parseInt(numQuotas, 10)) &&
                  parseInt(numQuotas, 10) >= 2 && (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewTitle}>Vista previa</Text>
                      <Text style={styles.previewText}>
                        {numQuotas} cuotas de ~
                        {formatCurrency(
                          Math.round(
                            selectedTransaction.amount /
                              parseInt(numQuotas, 10),
                          ),
                          selectedTransaction.currency,
                        )}
                      </Text>
                      <Text style={styles.previewText}>
                        Primera cuota vence:{" "}
                        {(() => {
                          const d = new Date(
                            selectedTransaction.transactionDate,
                          );
                          d.setMonth(d.getMonth() + 1);
                          return formatDate(d.toISOString());
                        })()}
                      </Text>
                    </View>
                  )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSelectedTransaction(null)}
                  >
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, creating && { opacity: 0.6 }]}
                    onPress={handleCreateQuotas}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                      <Text style={styles.confirmButtonText}>Crear Cuotas</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  contentContainer: { padding: spacing.md, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  loadingText: { marginTop: spacing.sm2, fontSize: 15, color: colors.textMuted },

  // Card selector chips
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  cardChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  cardChipTextActive: { color: colors.textPrimary },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.border },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    textTransform: "uppercase",
  },
  nextDueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm2,
    paddingTop: spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextDueText: { fontSize: 13, color: colors.textMuted },

  // Filters
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: 14,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  filterTabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  filterTabTextActive: { color: colors.textPrimary },

  // Create button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: spacing.sm2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },

  // Quota Card
  quotaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quotaCardOverdue: {
    borderLeftColor: colors.destructive,
    borderLeftWidth: 3,
    backgroundColor: colors.destructiveBg,
  },
  quotaCardDueSoon: {
    borderLeftColor: colors.warning,
    borderLeftWidth: 3,
    backgroundColor: colors.warningBg,
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  quotaHeaderLeft: { flex: 1, marginRight: 10 },
  quotaHeaderRight: { alignItems: "flex-end" },
  quotaMerchant: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  quotaProgress: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xxs },
  quotaAmount: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  paidBadgeText: { fontSize: 11, fontWeight: "600", color: colors.success },
  quotaDetails: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  quotaDetailItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  quotaDetailText: { fontSize: 12, color: colors.textMuted },

  // Mini progress
  miniProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 10,
  },
  miniProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  miniProgressText: { fontSize: 11, color: colors.textMuted },

  // Mark paid
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  markPaidText: { fontSize: 13, fontWeight: "600", color: colors.success },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md2,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm2 },

  // Transaction options
  txOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  txOptionMerchant: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  txOptionDate: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xxs },
  txOptionAmount: { fontSize: 14, fontWeight: "700", color: colors.destructive },
  noTxText: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.md2,
    fontSize: 14,
  },

  // Selected tx
  selectedTxCard: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  selectedTxMerchant: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  selectedTxAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.destructive,
    marginTop: spacing.xs,
  },
  selectedTxDate: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },

  // Input
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm2,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm2,
  },

  // Preview
  previewBox: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  previewText: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xxs },

  // Modal actions
  modalActions: { flexDirection: "row", gap: 10 },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
    backgroundColor: colors.success,
  },
  confirmButtonText: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },

  // Load More
  loadMoreButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingVertical: spacing.sm2,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.input,
    alignItems: "center",
  },
  loadMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
  },
});
