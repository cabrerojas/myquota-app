import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import CategorySuggestModal from "@/features/categories/components/CategorySuggestModal";
import {
  useSplitQuotasMutation,
  useTransactionDetail,
  useUpdateTransactionMutation,
} from "@/features/transactions/services/transactionsApi";
import {
  canShowRefundAction,
  getRefundStatusChip,
  hasTransactionRefunds,
} from "@/features/transactions/utils/refundPresentation";
import ErrorState from "@/shared/components/ErrorState";
import {
  borderRadius,
  colors,
  fontSizes,
  spacing,
} from "@/shared/theme/tokens";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { buildRefundEntryRoute } from "@/shared/utils/routes";

const STATUS_DOT_SIZE = 3;
const STATUS_META_GAP = spacing.sm - spacing.xxs;
const BUTTON_VERTICAL_PADDING = 10;

interface Props {
  creditCardId: string;
  transactionId: string;
}

export default function TransactionDetailScreen({
  creditCardId,
  transactionId,
}: Props) {
  const { data, isLoading, isFetching, error, refetch } = useTransactionDetail(
    creditCardId,
    transactionId,
  );
  const updateTransactionMutation = useUpdateTransactionMutation();
  const splitQuotasMutation = useSplitQuotasMutation();

  // Category modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Split modal
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [numQuotas, setNumQuotas] = useState("3");

  const transaction = data?.transaction ?? null;
  const quotas = data?.quotas ?? [];
  const router = useRouter();

  const onRefresh = async () => {
    await refetch();
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

    try {
      await splitQuotasMutation.mutateAsync({
        creditCardId,
        transactionId,
        numberOfQuotas: n,
      });
      Alert.alert("Éxito", `Transacción dividida en ${n} cuotas`);
      setShowSplitModal(false);
      setNumQuotas("3");
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudieron crear las cuotas",
      );
    }
  };

  const handleCategorySelected = async (category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  }) => {
    try {
      await updateTransactionMutation.mutateAsync({
        creditCardId,
        transactionId,
        data: {
          categoryId: category.id,
        },
      });
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo actualizar la categoría",
      );
    } finally {
      setCategoryModalVisible(false);
    }
  };

  const paidCount = quotas.filter((q) => q.status === "paid").length;
  const pendingCount = quotas.length - paidCount;
  const refundedAmount = transaction?.refundedAmount ?? 0;
  const refundableAmount = transaction?.refundableAmount ?? 0;
  const refundChip = transaction ? getRefundStatusChip(transaction) : null;
  const refunds = useMemo(
    () =>
      [...(transaction?.refunds ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt || b.transactionDate).getTime() -
          new Date(a.createdAt || a.transactionDate).getTime(),
      ),
    [transaction?.refunds],
  );
  const hasRefunds = transaction ? hasTransactionRefunds(transaction) : false;
  const isRefundChild = transaction?.source === "refund";
  const canRegisterRefund = transaction
    ? canShowRefundAction(transaction)
    : false;
  const splitting = splitQuotasMutation.isPending;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "No se encontró la transacción"
        }
        onRetry={() => {
          refetch();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {canRegisterRefund && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            accessibilityLabel="Más acciones"
            icon={
              process.env.EXPO_OS === "ios"
                ? "ellipsis.circle"
                : require("../../../../assets/icons/more-vert.xml")
            }
          >
            <Stack.Toolbar.MenuAction
              icon={
                process.env.EXPO_OS === "ios"
                  ? "arrow.uturn.backward.circle"
                  : require("../../../../assets/icons/undo.xml")
              }
              onPress={() =>
                router.push(
                  buildRefundEntryRoute({ creditCardId, transactionId }),
                )
              }
            >
              Registrar reembolso
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
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
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.headerMetaText}>
              {formatDate(transaction.transactionDate)}
            </Text>
          </View>
          <View style={styles.metaBadgeRow}>
            {transaction.source === "email" && (
              <View style={[styles.sourceBadge, styles.sourceBadgeImported]}>
                <Text
                  style={[
                    styles.sourceBadgeText,
                    styles.sourceBadgeImportedText,
                  ]}
                >
                  Importada
                </Text>
              </View>
            )}
            {transaction.source === "refund" && (
              <View style={[styles.sourceBadge, styles.sourceBadgeRefund]}>
                <Text
                  style={[styles.sourceBadgeText, styles.sourceBadgeRefundText]}
                >
                  Reembolso vinculado
                </Text>
              </View>
            )}
            {refundChip?.tone === "warning" && (
              <View style={[styles.sourceBadge, styles.sourceBadgeWarning]}>
                <Text
                  style={[
                    styles.sourceBadgeText,
                    styles.sourceBadgeWarningText,
                  ]}
                >
                  {refundChip.label}
                </Text>
              </View>
            )}
            {refundChip?.tone === "success" && (
              <View style={[styles.sourceBadge, styles.sourceBadgeSuccess]}>
                <Text
                  style={[
                    styles.sourceBadgeText,
                    styles.sourceBadgeSuccessText,
                  ]}
                >
                  {refundChip.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Monto Total</Text>
            <Text
              style={[
                styles.amountValue,
                (transaction.amount < 0 || isRefundChild) &&
                  styles.amountValueRefund,
              ]}
            >
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

        {hasRefunds && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBlock}>
                <Text style={styles.sectionTitle}>Reembolsos</Text>
                <Text style={styles.sectionSubtitle}>
                  Historial de movimientos vinculados a esta compra.
                </Text>
              </View>
            </View>

            <View style={styles.refundSummaryRow}>
              <View style={styles.refundSummaryItem}>
                <Text style={styles.refundSummaryLabel}>Monto reembolsado</Text>
                <Text
                  style={[
                    styles.refundSummaryValue,
                    styles.refundSummaryValueSuccess,
                  ]}
                >
                  {formatCurrency(refundedAmount, transaction.currency)}
                </Text>
              </View>
              <View style={styles.refundSummaryItem}>
                <Text style={styles.refundSummaryLabel}>
                  Disponible para reembolso
                </Text>
                <Text style={styles.refundSummaryValue}>
                  {formatCurrency(refundableAmount, transaction.currency)}
                </Text>
              </View>
            </View>

            <View style={styles.refundHistoryList}>
              {refunds.map((refund, index) => (
                <View
                  key={refund.id}
                  style={[
                    styles.refundHistoryItem,
                    index === refunds.length - 1 &&
                      styles.refundHistoryItemLast,
                  ]}
                >
                  <View style={styles.refundHistoryLeft}>
                    <Text style={styles.refundHistoryTitle}>
                      Reembolso vinculado
                    </Text>
                    <Text style={styles.refundHistoryMeta}>
                      {formatDate(refund.transactionDate)}
                    </Text>
                    {refund.refundReason ? (
                      <Text style={styles.refundHistoryReason}>
                        {refund.refundReason}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.refundHistoryAmount}>
                    {formatCurrency(refund.amount, refund.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categoría</Text>
            <Pressable
              style={styles.editButton}
              onPress={() => setCategoryModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Cambiar categoría"
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color={colors.secondary}
              />
              <Text style={styles.editButtonText}>Cambiar</Text>
            </Pressable>
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
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={colors.warning}
              />
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
              <Pressable
                style={styles.splitButton}
                onPress={() => setShowSplitModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Dividir compra en cuotas"
              >
                <Ionicons
                  name="git-branch-outline"
                  size={16}
                  color={colors.textPrimary}
                />
                <Text style={styles.splitButtonText}>Dividir</Text>
              </Pressable>
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
                        <Ionicons
                          name="warning"
                          size={12}
                          color={colors.destructive}
                        />
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
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowSplitModal(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmButton,
                  splitting && { opacity: 0.6 },
                ]}
                onPress={handleSplitQuotas}
                disabled={splitting}
                accessibilityRole="button"
              >
                {splitting ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.modalConfirmText}>Dividir</Text>
                )}
              </Pressable>
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
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
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
    paddingVertical: BUTTON_VERTICAL_PADDING,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },

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
    gap: STATUS_META_GAP,
  },
  headerMetaText: { fontSize: 13, color: colors.textMuted },
  metaBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm2,
  },
  dot: {
    width: STATUS_DOT_SIZE,
    height: STATUS_DOT_SIZE,
    borderRadius: STATUS_DOT_SIZE / 2,
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
    paddingVertical: spacing.xs,
  },
  amountLabel: { fontSize: 14, color: colors.textMuted },
  amountValue: { fontSize: 20, fontWeight: "700", color: colors.destructive },
  amountValueRefund: { color: colors.success },
  amountCurrency: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
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
  sectionTitleBlock: { flex: 1, marginRight: spacing.sm2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: { fontSize: 13, color: colors.secondary, fontWeight: "600" },
  sourceBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm2,
    paddingVertical: STATUS_META_GAP,
    minHeight: spacing.xxl - spacing.sm2,
    justifyContent: "center",
  },
  sourceBadgeText: { fontSize: fontSizes.xs, fontWeight: "700" },
  sourceBadgeImported: { backgroundColor: colors.secondary },
  sourceBadgeImportedText: { color: colors.textPrimary },
  sourceBadgeRefund: { backgroundColor: colors.successBg },
  sourceBadgeRefundText: { color: colors.success },
  sourceBadgeWarning: { backgroundColor: colors.warningBg },
  sourceBadgeWarningText: { color: colors.warning },
  sourceBadgeSuccess: { backgroundColor: colors.successBg },
  sourceBadgeSuccessText: { color: colors.success },

  // Category
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
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
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: "dashed",
    backgroundColor: colors.warningBg,
    gap: 6,
    alignSelf: "flex-start",
  },
  uncategorizedText: { fontSize: 14, fontWeight: "600", color: colors.warning },

  // Refunds
  refundButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.sm2,
    borderRadius: borderRadius.input,
    backgroundColor: colors.accent,
  },
  refundButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  refundSummaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm2,
  },
  refundSummaryItem: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  refundSummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSubtle,
  },
  refundSummaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 6,
  },
  refundSummaryValueSuccess: { color: colors.success },
  refundEmptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
  },
  refundEmptyText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  refundHistoryList: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  refundHistoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm2,
    paddingVertical: spacing.sm2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  refundHistoryItemLast: { borderBottomWidth: 0, paddingBottom: 0 },
  refundHistoryLeft: { flex: 1 },
  refundHistoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  refundHistoryMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  refundHistoryReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  refundHistoryAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.success,
  },

  // Quotas Title
  quotasTitleRow: { flex: 1, marginRight: spacing.sm2 },
  quotasBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  badgePaid: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgePending: {
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
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
  splitButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },

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
    borderRadius: borderRadius.md,
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
  statusBadgePaidText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.success,
  },
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
    backgroundColor: colors.glass.background,
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
  modalTextarea: {
    minHeight: 88,
    textAlign: "left",
  },
  modalErrorText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.destructive,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: colors.successBg,
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
    minHeight: 44,
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm2,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  modalButtonDisabled: { opacity: 0.5 },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  refundConfirmButton: { backgroundColor: colors.accent },
  useAvailableButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  useAvailableButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
  },
  refundHelperCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm2,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
  },
  refundHelperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
