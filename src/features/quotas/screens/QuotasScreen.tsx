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
import {
  getTransactionsByCreditCard,
  Transaction,
} from "@/features/transactions/services/transactionsApi";
import {
  getQuotasByTransaction,
  splitQuotas,
  updateQuota,
  QuotaWithTransaction,
} from "@/features/quotas/services/quotasApi";
import { CreditCardBasic } from "@/shared/types/creditCard";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
} from "@/shared/utils/format";

type FilterMode = "pending" | "paid" | "all";

export default function QuotasScreen() {
  const [creditCards, setCreditCards] = useState<CreditCardBasic[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<QuotaWithTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("pending");

  // Modal para crear cuotas
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [numQuotas, setNumQuotas] = useState("3");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getCreditCards().then((cards) => {
      setCreditCards(cards);
      if (cards.length > 0) {
        setSelectedCardId(cards[0].id);
      }
      setLoading(false);
    });
  }, []);

  const fetchQuotas = useCallback(async () => {
    if (!selectedCardId) return;
    try {
      const txs = await getTransactionsByCreditCard(selectedCardId);
      setTransactions(txs);

      // Fetch quotas for all transactions in parallel
      const results = await Promise.all(
        txs.map(async (tx) => {
          const txQuotas = await getQuotasByTransaction(selectedCardId, tx.id);
          if (txQuotas.length === 0) return [];

          const sorted = [...txQuotas].sort(
            (a, b) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
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

      const allQuotas = results.flat();
      // Sort by due date
      allQuotas.sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      );
      setQuotas(allQuotas);
    } catch (error) {
      console.error("Error fetching quotas:", error);
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
    await fetchQuotas();
    setRefreshing(false);
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
        payment_date: new Date().toISOString(),
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Cargando cuotas...</Text>
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
      {/* Card Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
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
              color={selectedCardId === card.id ? "#fff" : "#495057"}
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
              <Ionicons name="time-outline" size={20} color="#F57C00" />
              <Text style={styles.summaryValue}>{summary.pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pendientes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cart-outline" size={20} color="#007BFF" />
              <Text style={styles.summaryValue}>
                {summary.uniqueTransactions}
              </Text>
              <Text style={styles.summaryLabel}>Compras</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cash-outline" size={20} color="#DC3545" />
              <Text style={styles.summaryValue}>
                ${summary.totalPending.toLocaleString("es-CL")}
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
          {summary.nextDue && (
            <View style={styles.nextDueRow}>
              <Ionicons name="calendar-outline" size={14} color="#868E96" />
              <Text style={styles.nextDueText}>
                Próximo vencimiento: {formatDate(summary.nextDue.due_date)}
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
              color={filter === f.key ? "#fff" : "#495057"}
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
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Crear Cuotas</Text>
      </TouchableOpacity>

      {/* Quotas List */}
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#007BFF"
          style={{ marginTop: 20 }}
        />
      ) : filteredQuotas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="layers-outline" size={56} color="#CED4DA" />
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
            quota.status === "pending" && isOverdue(quota.due_date);
          const dueSoon =
            quota.status === "pending" && !overdue && isDueSoon(quota.due_date);

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
                      overdue && { color: "#DC3545" },
                    ]}
                  >
                    {formatCurrency(quota.amount, quota.currency)}
                  </Text>
                  {quota.status === "paid" ? (
                    <View style={styles.paidBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#28A745"
                      />
                      <Text style={styles.paidBadgeText}>Pagada</Text>
                    </View>
                  ) : overdue ? (
                    <View
                      style={[styles.paidBadge, { backgroundColor: "#FFF3F3" }]}
                    >
                      <Ionicons name="alert-circle" size={12} color="#DC3545" />
                      <Text
                        style={[styles.paidBadgeText, { color: "#DC3545" }]}
                      >
                        Vencida
                      </Text>
                    </View>
                  ) : dueSoon ? (
                    <View
                      style={[styles.paidBadge, { backgroundColor: "#FFF8E1" }]}
                    >
                      <Ionicons name="time" size={12} color="#F57C00" />
                      <Text
                        style={[styles.paidBadgeText, { color: "#F57C00" }]}
                      >
                        Pronto
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.quotaDetails}>
                <View style={styles.quotaDetailItem}>
                  <Ionicons name="calendar-outline" size={13} color="#868E96" />
                  <Text style={styles.quotaDetailText}>
                    Vence: {formatShortDate(quota.due_date)}
                  </Text>
                </View>
                <View style={styles.quotaDetailItem}>
                  <Ionicons name="receipt-outline" size={13} color="#868E96" />
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
                    color="#28A745"
                  />
                  <Text style={styles.markPaidText}>Marcar como pagada</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
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
                <Ionicons name="close" size={24} color="#495057" />
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
                      <ActivityIndicator size="small" color="#fff" />
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
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: { marginTop: 12, fontSize: 15, color: "#868E96" },

  // Card selector chips
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cardChipActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  cardChipText: { fontSize: 13, fontWeight: "600", color: "#495057" },
  cardChipTextActive: { color: "#fff" },

  // Summary
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "#E9ECEF" },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#868E96",
    marginTop: 2,
    textTransform: "uppercase",
  },
  nextDueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  nextDueText: { fontSize: 13, color: "#868E96" },

  // Filters
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  filterTabActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  filterTabText: { fontSize: 13, fontWeight: "600", color: "#495057" },
  filterTabTextActive: { color: "#fff" },

  // Create button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#28A745",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  createButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#495057",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#868E96",
    marginTop: 6,
    textAlign: "center",
  },

  // Quota Card
  quotaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  quotaCardOverdue: { borderColor: "#FFCDD2", backgroundColor: "#FFFAFA" },
  quotaCardDueSoon: { borderColor: "#FFE082", backgroundColor: "#FFFDF5" },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  quotaHeaderLeft: { flex: 1, marginRight: 10 },
  quotaHeaderRight: { alignItems: "flex-end" },
  quotaMerchant: { fontSize: 15, fontWeight: "600", color: "#212529" },
  quotaProgress: { fontSize: 12, color: "#868E96", marginTop: 2 },
  quotaAmount: { fontSize: 16, fontWeight: "700", color: "#212529" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  paidBadgeText: { fontSize: 11, fontWeight: "600", color: "#28A745" },
  quotaDetails: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  quotaDetailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  quotaDetailText: { fontSize: 12, color: "#868E96" },

  // Mini progress
  miniProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  miniProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E9ECEF",
    borderRadius: 2,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 2,
  },
  miniProgressText: { fontSize: 11, color: "#868E96" },

  // Mark paid
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  markPaidText: { fontSize: 13, fontWeight: "600", color: "#28A745" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#212529" },
  modalSubtitle: { fontSize: 14, color: "#868E96", marginBottom: 12 },

  // Transaction options
  txOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  txOptionMerchant: { fontSize: 14, fontWeight: "600", color: "#212529" },
  txOptionDate: { fontSize: 12, color: "#868E96", marginTop: 2 },
  txOptionAmount: { fontSize: 14, fontWeight: "700", color: "#DC3545" },
  noTxText: {
    textAlign: "center",
    color: "#868E96",
    paddingVertical: 20,
    fontSize: 14,
  },

  // Selected tx
  selectedTxCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  selectedTxMerchant: { fontSize: 15, fontWeight: "600", color: "#212529" },
  selectedTxAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC3545",
    marginTop: 4,
  },
  selectedTxDate: { fontSize: 12, color: "#868E96", marginTop: 4 },

  // Input
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#212529",
    marginBottom: 12,
  },

  // Preview
  previewBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
    marginBottom: 4,
  },
  previewText: { fontSize: 13, color: "#495057", marginTop: 2 },

  // Modal actions
  modalActions: { flexDirection: "row", gap: 10 },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  backButtonText: { fontSize: 14, fontWeight: "600", color: "#495057" },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#28A745",
  },
  confirmButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
