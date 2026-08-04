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
import { useState, useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  getTransactionById,
  Transaction,
  updateTransaction,
} from "../services/transactionsApi";
import {
  getQuotasByTransaction,
  splitQuotas,
  Quota,
} from "@/features/quotas/services/quotasApi";
import CategorySuggestModal from "@/features/categories/components/CategorySuggestModal";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";

interface Props {
  creditCardId: string;
  transactionId: string;
}

export default function TransactionDetailScreen({
  creditCardId,
  transactionId,
}: Props) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Split modal
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [numQuotas, setNumQuotas] = useState("3");
  const [splitting, setSplitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [tx, txQuotas] = await Promise.all([
        getTransactionById(creditCardId, transactionId),
        getQuotasByTransaction(creditCardId, transactionId),
      ]);
      setTransaction(tx);
      const sorted = [...txQuotas].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
      setQuotas(sorted);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar la transacción",
      );
    }
  }, [creditCardId, transactionId]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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

  const handleSplitQuotas = async () => {
    const n = parseInt(numQuotas, 10);
    if (isNaN(n) || n < 2 || n > 48) {
      Alert.alert("Error", "Ingresa un número de cuotas entre 2 y 48");
      return;
    }
    setSplitting(true);
    try {
      await splitQuotas(creditCardId, transactionId, n);
      Alert.alert("Éxito", `Transacción dividida en ${n} cuotas`);
      setShowSplitModal(false);
      setNumQuotas("3");
      await fetchData();
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudieron crear las cuotas",
      );
    } finally {
      setSplitting(false);
    }
  };

  const handleCategorySelected = async (category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  }) => {
    try {
      const res = await updateTransaction(creditCardId, transactionId, {
        categoryId: category.id,
      });
      const updated = res?.data;
      if (updated) {
        setTransaction(updated);
      } else {
        await fetchData();
      }
    } catch (e) {
      console.error("Error updating transaction category", e);
    } finally {
      setCategoryModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={styles.errorText}>
          {error || "No se encontró la transacción"}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paidCount = quotas.filter((q) => q.status === "paid").length;
  const pendingCount = quotas.length - paidCount;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.merchant}>{transaction.merchant}</Text>
          <View style={styles.headerMeta}>
            <Ionicons name="card-outline" size={14} color={colors.textMuted} />
            <Text style={styles.headerMetaText}>
              {transaction.cardType} •{transaction.cardLastDigits}
            </Text>
            <View style={styles.dot} />
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.headerMetaText}>
              {formatDate(transaction.transactionDate)}
            </Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Monto Total</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(transaction.amount, transaction.currency)}
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Moneda</Text>
            <Text style={styles.amountCurrency}>
              {transaction.currency === "USD" ? "USD" : "CLP"}
            </Text>
          </View>
        </View>

        {/* Category */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categoría</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.secondary} />
              <Text style={styles.editButtonText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
          {transaction.categoryId ? (
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: transaction.categoryColor || colors.border },
              ]}
            >
              <Text style={styles.categoryEmoji}>
                {transaction.categoryIcon || "🏷️"}
              </Text>
              <Text style={styles.categoryName}>
                {transaction.categoryName}
              </Text>
            </View>
          ) : (
            <View style={styles.uncategorizedPill}>
              <Ionicons name="pricetag-outline" size={16} color={colors.warning} />
              <Text style={styles.uncategorizedText}>Sin categoría</Text>
            </View>
          )}
        </View>

        {/* Quotas Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.quotasTitleRow}>
              <Text style={styles.sectionTitle}>Cuotas ({quotas.length})</Text>
              {quotas.length > 1 && (
                <View style={styles.quotasBadgeRow}>
                  <View style={styles.badgePaid}>
                    <Text style={styles.badgeText}>
                      {paidCount} pagada{paidCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.badgePending}>
                    <Text style={styles.badgeText}>
                      {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {quotas.length <= 1 && (
              <TouchableOpacity
                style={styles.splitButton}
                onPress={() => setShowSplitModal(true)}
              >
                <Ionicons name="git-branch-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.splitButtonText}>Dividir</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar */}
          {quotas.length > 1 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(paidCount / quotas.length) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {paidCount}/{quotas.length}
              </Text>
            </View>
          )}

          {/* Quota list */}
          {quotas.map((quota, index) => {
            const effectiveDueDate = quota.billingDueDate || quota.dueDate;
            const overdue =
              quota.status === "pending" && isOverdue(effectiveDueDate);
            const dueSoon =
              quota.status === "pending" &&
              !overdue &&
              isDueSoon(effectiveDueDate);

            return (
              <View
                key={quota.id}
                style={[
                  styles.quotaCard,
                  overdue && styles.quotaCardOverdue,
                  dueSoon && styles.quotaCardDueSoon,
                  quota.status === "paid" && styles.quotaCardPaid,
                ]}
              >
                <View style={styles.quotaLeft}>
                  <View style={styles.quotaNumberRow}>
                    <Text style={styles.quotaNumber}>
                      Cuota {index + 1}/{quotas.length}
                    </Text>
                    {quota.status === "paid" && (
                      <View style={styles.statusBadgePaid}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color={colors.success}
                        />
                        <Text style={styles.statusBadgePaidText}>Pagada</Text>
                      </View>
                    )}
                    {overdue && (
                      <View style={styles.statusBadgeOverdue}>
                        <Ionicons name="warning" size={12} color={colors.destructive} />
                        <Text style={styles.statusBadgeOverdueText}>
                          Vencida
                        </Text>
                      </View>
                    )}
                    {dueSoon && (
                      <View style={styles.statusBadgeDueSoon}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={colors.warning}
                        />
                        <Text style={styles.statusBadgeDueSoonText}>
                          Próxima
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quotaDueDate}>
                    Vence: {formatDate(effectiveDueDate)}
                  </Text>
                  {quota.paymentDate && (
                    <Text style={styles.quotaPaymentDate}>
                      Pagada: {formatDate(quota.paymentDate)}
                    </Text>
                  )}
                </View>
                <View style={styles.quotaRight}>
                  <Text
                    style={[
                      styles.quotaAmount,
                      quota.status === "paid" && styles.quotaAmountPaid,
                    ]}
                  >
                    {formatCurrency(quota.amount, quota.currency)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Split Modal */}
      <Modal
        visible={showSplitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSplitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dividir en Cuotas</Text>
            <Text style={styles.modalSubtitle}>
              Monto total:{" "}
              {formatCurrency(transaction.amount, transaction.currency)}
            </Text>

            <Text style={styles.modalLabel}>Número de cuotas</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={numQuotas}
              onChangeText={setNumQuotas}
              placeholder="2-48"
              placeholderTextColor={colors.textMuted}
              maxLength={2}
            />

            {/* Preview */}
            {(() => {
              const n = parseInt(numQuotas, 10);
              if (!isNaN(n) && n >= 2 && n <= 48) {
                const perQuota = Math.floor(transaction.amount / n);
                return (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewText}>
                      {n} cuotas de{" "}
                      {formatCurrency(perQuota, transaction.currency)}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSplitModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  splitting && { opacity: 0.6 },
                ]}
                onPress={handleSplitQuotas}
                disabled={splitting}
              >
                {splitting ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.modalConfirmText}>Dividir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <CategorySuggestModal
        visible={categoryModalVisible}
        merchant={transaction.merchant}
        onClose={() => setCategoryModalVisible(false)}
        onCategorySelected={handleCategorySelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.md2,
  },
  errorText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.sm2,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryButtonText: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },

  // Header Card
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md2,
    marginBottom: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchant: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerMetaText: { fontSize: 13, color: colors.textMuted },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },

  // Amount Card
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  amountLabel: { fontSize: 14, color: colors.textMuted },
  amountValue: { fontSize: 20, fontWeight: "700", color: colors.destructive },
  amountCurrency: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  amountDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: { fontSize: 13, color: colors.secondary, fontWeight: "600" },

  // Category
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
  },
  categoryEmoji: { fontSize: 16 },
  categoryName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  uncategorizedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: "dashed",
    backgroundColor: colors.warningBg,
    gap: 6,
    alignSelf: "flex-start",
  },
  uncategorizedText: { fontSize: 14, fontWeight: "600", color: colors.warning },

  // Quotas Title
  quotasTitleRow: { flex: 1, marginRight: spacing.sm2 },
  quotasBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  badgePaid: {
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgePending: {
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },

  // Split button
  splitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  splitButtonText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },

  // Progress
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm2,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },

  // Quota Card
  quotaCard: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: spacing.sm2,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  quotaCardOverdue: {
    borderLeftColor: colors.destructive,
    backgroundColor: colors.destructiveBg,
  },
  quotaCardDueSoon: {
    borderLeftColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  quotaCardPaid: {
    borderLeftColor: colors.success,
    backgroundColor: colors.successBg,
  },
  quotaLeft: { flex: 1, marginRight: spacing.sm2 },
  quotaNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quotaNumber: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  quotaDueDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  quotaPaymentDate: { fontSize: 12, color: colors.success, marginTop: 1 },
  quotaRight: { alignItems: "flex-end" },
  quotaAmount: { fontSize: 15, fontWeight: "700", color: colors.destructive },
  quotaAmountPaid: { color: colors.success },
  // Status badges
  statusBadgePaid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.input,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgePaidText: { fontSize: 10, fontWeight: "600", color: colors.success },
  statusBadgeOverdue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.destructiveBg,
    borderRadius: borderRadius.input,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeOverdueText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.destructive,
  },
  statusBadgeDueSoon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.input,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeDueSoonText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.warning,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md2,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.glass,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md2,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
    fontSize: 18,
    textAlign: "center",
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  previewCard: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
    marginTop: spacing.md,
    alignItems: "center",
  },
  previewText: { fontSize: 15, fontWeight: "600", color: colors.secondary },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm2,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm2,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm2,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
